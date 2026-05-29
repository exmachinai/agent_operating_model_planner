"""LLM-Client (Azure AI Foundry, Claude Sonnet 4.6).

Single integration seam für alle LLM-Calls. Ist Foundry nicht konfiguriert
(`AZURE_FOUNDRY_ENDPOINT`/`_API_KEY` leer), fällt der Aufrufer auf den
deterministischen Mock zurück (siehe interview_engine).

`complete()` ist der echte Foundry-Pfad — gegen die Live-Instanz noch ungetestet,
da im Spike keine Creds vorliegen. Bewusst minimal: ein synchroner Messages-Call,
kein Token-Streaming (das Streaming-Gefühl erzeugt der SSE-Router clientseitig).
"""

from __future__ import annotations

import logging

import httpx

from ..config import get_settings

logger = logging.getLogger("aegira.planner.api.llm")


def is_configured() -> bool:
    s = get_settings()
    return bool(s.foundry_endpoint and s.foundry_api_key)


async def complete(system: str, user: str, *, max_tokens: int = 1024) -> str:
    """Ruft Foundry (Anthropic-Messages-Format) und liefert den Text-Output.

    UNGETESTET gegen Live-Foundry — exakte Endpoint-/Header-Form ist beim
    Hookup zu verifizieren (docs/06_azure-configuration-guide.md).
    """
    s = get_settings()
    payload = {
        "model": s.foundry_deployment_primary,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{s.foundry_endpoint.rstrip('/')}/v1/messages",
            headers={
                "x-api-key": s.foundry_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
    # Anthropic-Format: {"content": [{"type": "text", "text": "..."}]}
    parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
    return "".join(parts).strip()
