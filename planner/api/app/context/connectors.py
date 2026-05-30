"""Cloud-Quellen (Schritt 2a, Phase B) — Connector-Registry + Status.

Spec: docs/09_process-flow.md (Schritt 2a, Variante b „Ordner mounten"). Eine
lebende OAuth-Verbindung zu SharePoint/OneDrive/Dropbox/Azure Blob, aus der der
Planner Dokumente *kontinuierlich* liest — derselbe ephemere Verarbeitungspfad
wie beim Upload (Inhalt nur für die Schärfung, nur der Nachweis bleibt).

**Bewusster Blocker.** Phase B braucht externe Voraussetzungen, die wir im Code
nicht setzen können: eine OAuth-App-Registrierung je Anbieter plus Tenant-
Secrets. Solange die zugehörigen Env-Vars fehlen, meldet jeder Provider den
Status `blocked` und nennt die fehlende Konfiguration — statt einen halben,
scheinbar funktionierenden Connect vorzutäuschen. Die tatsächliche OAuth- und
Lese-Implementierung folgt, sobald die Registrierungen vorliegen.
"""

from __future__ import annotations

import os
from typing import Literal, Protocol

from pydantic import BaseModel

CloudProvider = Literal["sharepoint", "onedrive", "dropbox", "azure-blob"]
ConnectorStatus = Literal["configured", "blocked"]


class ProviderInfo(BaseModel):
    """Anbieter-Beschreibung + Konfigurationsstatus (für die UI)."""

    id: CloudProvider
    label: str
    # OAuth-/Zugriffs-Scopes, die die App-Registrierung anfordern muss.
    scopes: list[str]
    # Env-Vars, die für den Betrieb gesetzt sein müssen (der Blocker).
    required_env: list[str]
    status: ConnectorStatus
    # Was fehlt konkret, wenn status == "blocked".
    missing_env: list[str]
    note: str


# Anbieter-Stammdaten. Scopes/Env-Namen sind die, die die spätere Implementierung
# erwartet — sie dokumentieren zugleich, was die App-Registrierung liefern muss.
# v0.4 (docs/11): Cloud-Provider (SharePoint/OneDrive/Dropbox/Azure-Blob) bewusst
# entfernt — der Fokus liegt auf lokalen Quellen (Datei/Bild-Upload + lokaler
# Ordner). `list_providers()` liefert daher eine leere Liste; die Connect-/Import-
# Endpunkte bleiben für Abwärtskompatibilität, werden aber von der UI nicht mehr
# angeboten. Die Connector-Klassen unten bleiben als Referenz für eine spätere,
# bewusste Reaktivierung erhalten.
_REGISTRY: dict[CloudProvider, dict] = {}


def _missing_env(required: list[str]) -> list[str]:
    return [name for name in required if not os.environ.get(name)]


def provider_info(provider: CloudProvider) -> ProviderInfo:
    meta = _REGISTRY.get(provider)
    if meta is None:
        # v0.4 — Provider entfernt: sauber als „blocked/removed" melden statt KeyError.
        return ProviderInfo(
            id=provider, label=provider, scopes=[], required_env=[],
            status="blocked", missing_env=[], note="Provider entfernt (v0.4).",
        )
    missing = _missing_env(meta["required_env"])
    return ProviderInfo(
        id=provider,
        label=meta["label"],
        scopes=meta["scopes"],
        required_env=meta["required_env"],
        status="configured" if not missing else "blocked",
        missing_env=missing,
        note=meta["note"],
    )


def list_providers() -> list[ProviderInfo]:
    """Alle Anbieter mit aktuellem Konfigurationsstatus."""
    return [provider_info(p) for p in _REGISTRY]  # type: ignore[arg-type]


class CloudConnector(Protocol):
    """Vertrag für einen lebenden Cloud-Connector (Implementierung folgt Phase B)."""

    provider: CloudProvider

    async def list_files(self, mount_uri: str) -> list[dict]: ...
    async def fetch(self, file_uri: str) -> bytes: ...


class NotConfiguredError(RuntimeError):
    """Connector ist nicht einsatzbereit — fehlende OAuth-App/Secrets."""

    def __init__(self, provider: CloudProvider, missing: list[str]) -> None:
        self.provider = provider
        self.missing = missing
        super().__init__(
            f"Cloud-Connector '{provider}' nicht konfiguriert. "
            f"Fehlende Konfiguration: {', '.join(missing) or 'OAuth-App-Registrierung'}."
        )


class DropboxConnector:
    """Echter Dropbox-Connector (Scoped App, Refresh-Token-Flow).

    Liest Ordner-Metadaten und Datei-Inhalte über die Dropbox HTTP-API. Der
    Inhalt wird ephemer verarbeitet (gleicher Pfad wie der Upload) — nur der
    Nachweis (Name + Hash) bleibt. Tokens werden nicht persistiert; das
    kurzlebige Access-Token wird je Aufruf aus dem Refresh-Token geholt.
    """

    provider: CloudProvider = "dropbox"
    _API = "https://api.dropboxapi.com"
    _CONTENT = "https://content.dropboxapi.com"

    def __init__(self, app_key: str, app_secret: str, refresh_token: str) -> None:
        self._app_key = app_key
        self._app_secret = app_secret
        self._refresh_token = refresh_token

    async def _access_token(self) -> str:
        import httpx

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self._API}/oauth2/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self._refresh_token,
                },
                auth=(self._app_key, self._app_secret),
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def list_files(self, mount_uri: str) -> list[dict]:
        """Listet Dateien (nicht-rekursiv) in einem Ordner; `mount_uri` ist der Pfad."""
        import httpx

        token = await self._access_token()
        path = "" if mount_uri in ("", "/") else mount_uri.rstrip("/")
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self._API}/2/files/list_folder",
                headers={"Authorization": f"Bearer {token}"},
                json={"path": path, "recursive": False},
            )
            resp.raise_for_status()
            entries = resp.json().get("entries", [])
        return [
            {
                "name": e["name"],
                "path": e.get("path_lower", ""),
                "size": e.get("size", 0),
            }
            for e in entries
            if e.get(".tag") == "file"
        ]

    async def fetch(self, file_uri: str) -> bytes:
        """Lädt den Inhalt einer Datei (ephemer — nur für die Schärfung)."""
        import json as _json

        import httpx

        token = await self._access_token()
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self._CONTENT}/2/files/download",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Dropbox-API-Arg": _json.dumps({"path": file_uri}),
                },
            )
            resp.raise_for_status()
            return resp.content


_CONNECTOR_FACTORIES = {
    "dropbox": lambda: DropboxConnector(
        os.environ["DROPBOX_APP_KEY"],
        os.environ["DROPBOX_APP_SECRET"],
        os.environ["DROPBOX_REFRESH_TOKEN"],
    ),
}


def get_connector(provider: CloudProvider) -> CloudConnector:
    """Liefert einen einsatzbereiten Connector — oder hebt NotConfiguredError.

    Vorgabe (Handover WP-5): **nur Dropbox** ist real implementiert. Die übrigen
    Anbieter bleiben bewusst blockiert, bis ihre App-Registrierungen vorliegen.
    """
    info = provider_info(provider)
    if info.status == "blocked":
        raise NotConfiguredError(provider, info.missing_env)
    factory = _CONNECTOR_FACTORIES.get(provider)
    if factory is None:
        raise NotConfiguredError(provider, [])  # bewusst blockiert (SharePoint/OneDrive/Blob).
    return factory()
