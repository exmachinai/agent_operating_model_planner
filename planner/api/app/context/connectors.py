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
_REGISTRY: dict[CloudProvider, dict] = {
    "sharepoint": {
        "label": "Microsoft SharePoint",
        "scopes": ["Sites.Read.All", "Files.Read.All", "offline_access"],
        "required_env": [
            "MS_GRAPH_CLIENT_ID",
            "MS_GRAPH_CLIENT_SECRET",
            "MS_GRAPH_TENANT_ID",
        ],
        "note": "Über Microsoft Graph; benötigt eine Entra-ID-App-Registrierung.",
    },
    "onedrive": {
        "label": "Microsoft OneDrive",
        "scopes": ["Files.Read.All", "offline_access"],
        "required_env": [
            "MS_GRAPH_CLIENT_ID",
            "MS_GRAPH_CLIENT_SECRET",
            "MS_GRAPH_TENANT_ID",
        ],
        "note": "Teilt die Entra-ID-App-Registrierung mit SharePoint (Microsoft Graph).",
    },
    "dropbox": {
        "label": "Dropbox",
        "scopes": ["files.metadata.read", "files.content.read"],
        "required_env": ["DROPBOX_APP_KEY", "DROPBOX_APP_SECRET"],
        "note": "Benötigt eine Dropbox-App (App Console) mit Scoped Access.",
    },
    "azure-blob": {
        "label": "Azure Blob Storage",
        "scopes": ["https://storage.azure.com/.default"],
        "required_env": ["AZURE_BLOB_ACCOUNT_URL"],
        "note": "Zugriff via Managed Identity/Entra ID; Account-URL muss gesetzt sein.",
    },
}


def _missing_env(required: list[str]) -> list[str]:
    return [name for name in required if not os.environ.get(name)]


def provider_info(provider: CloudProvider) -> ProviderInfo:
    meta = _REGISTRY[provider]
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


def get_connector(provider: CloudProvider) -> CloudConnector:
    """Liefert einen einsatzbereiten Connector — oder hebt NotConfiguredError.

    Bis die OAuth-App-Registrierungen und Secrets vorliegen, ist kein Anbieter
    einsatzbereit. Diese Funktion ist der zentrale Punkt, an dem Phase B die
    echten Connector-Klassen einhängt.
    """
    info = provider_info(provider)
    if info.status == "blocked":
        raise NotConfiguredError(provider, info.missing_env)
    raise NotConfiguredError(provider, [])  # Implementierung folgt (Phase B).
