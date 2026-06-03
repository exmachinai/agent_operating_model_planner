"""Schema-Validierung der kompilierten Harness-Artefakte (v0.9, P0.4/E1).

„Verifikation ist der höchste Hebel" (BP-MD §4). Hier liegt das **hinterlegte
Schema** als expliziter, dependency-freier Vertrag — verifiziert gegen die
offizielle Claude-Code-Doku (settings/hooks/sub-agents). Jeder Generator-Output
(`settings.json`, Hooks, Agenten-Frontmatter, `plugin.json`, `.mcp.json`) wird
gegen diesen Vertrag geprüft; Verstöße werfen `SchemaError` (→ Test rot, CI-Gate).

Bewusst KEIN externes `jsonschema` (keine neue Laufzeit-Abhängigkeit): Die
zulässigen Felder/Werte sind als Mengen kodiert. Ein erfundenes Feld
(z. B. `thinking_budget`, `subagents_path`) schlägt damit hart fehl.
"""

from __future__ import annotations

import re
from typing import Any


class SchemaError(ValueError):
    """Ein Artefakt verletzt das hinterlegte Claude-Code-Schema."""


# --- settings.json (verifiziert gegen code.claude.com/docs/en/settings) ------

_ALLOWED_SETTINGS_KEYS = {
    "$schema", "model", "env", "permissions", "hooks",
    "includeCoAuthoredBy", "cleanupPeriodDays", "enableAllProjectMcpServers",
    "apiKeyHelper", "statusLine", "outputStyle", "disableAllHooks",
    "enabledPlugins", "forceLoginMethod",
}
_ALLOWED_PERMISSION_KEYS = {
    "allow", "deny", "ask", "defaultMode", "additionalDirectories",
    "disableBypassPermissionsMode", "skipDangerousModePermissionPrompt",
}
_ALLOWED_DEFAULT_MODES = {
    "default", "acceptEdits", "plan", "auto", "dontAsk", "bypassPermissions",
}

# --- hooks (verifiziert gegen code.claude.com/docs/en/hooks) ------------------

_HOOK_EVENTS = {
    "SessionStart", "Setup", "SessionEnd",
    "UserPromptSubmit", "UserPromptExpansion", "Stop", "StopFailure",
    "PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest",
    "PermissionDenied", "PostToolBatch",
    "SubagentStart", "SubagentStop", "TeammateIdle",
    "FileChanged", "CwdChanged", "ConfigChange", "InstructionsLoaded",
    "WorktreeCreate", "WorktreeRemove", "PreCompact", "PostCompact",
    "TaskCreated", "TaskCompleted", "Elicitation", "ElicitationResult",
    "MessageDisplay", "Notification",
}
_HOOK_HANDLER_TYPES = {"command", "http", "mcp_tool", "prompt", "agent"}
_ALLOWED_HANDLER_KEYS = {
    "type", "command", "args", "if", "timeout", "statusMessage", "async",
    "asyncRewake", "shell", "url", "headers", "allowedEnvVars",
    "server", "tool", "input",
}

# --- Agenten-Frontmatter (sub-agents) ----------------------------------------

_ALLOWED_AGENT_FRONTMATTER = {"name", "description", "tools", "model", "color"}
_REQUIRED_AGENT_FRONTMATTER = {"name", "description"}

# --- plugin.json --------------------------------------------------------------

_ALLOWED_PLUGIN_KEYS = {
    "name", "version", "description", "agents", "skills", "commands",
    "hooks", "mcpServers", "author", "homepage", "license",
}

# --- .mcp.json ----------------------------------------------------------------

_MCP_TRANSPORTS = {"http", "stdio", "sse"}


def validate_settings(obj: Any) -> None:
    if not isinstance(obj, dict):
        raise SchemaError("settings.json: muss ein JSON-Objekt sein.")
    for key in obj:
        if key not in _ALLOWED_SETTINGS_KEYS:
            raise SchemaError(f"settings.json: unbekanntes Feld '{key}'.")
    perms = obj.get("permissions")
    if perms is not None:
        if not isinstance(perms, dict):
            raise SchemaError("settings.json: 'permissions' muss ein Objekt sein.")
        for key in perms:
            if key not in _ALLOWED_PERMISSION_KEYS:
                raise SchemaError(f"settings.json: unbekanntes permissions-Feld '{key}'.")
        mode = perms.get("defaultMode")
        if mode is not None and mode not in _ALLOWED_DEFAULT_MODES:
            raise SchemaError(f"settings.json: ungültiger defaultMode '{mode}'.")
        for lst in ("allow", "deny", "ask"):
            val = perms.get(lst)
            if val is not None and not (
                isinstance(val, list) and all(isinstance(x, str) for x in val)
            ):
                raise SchemaError(f"settings.json: permissions.{lst} muss eine String-Liste sein.")
    env = obj.get("env")
    if env is not None and not (
        isinstance(env, dict) and all(isinstance(v, str) for v in env.values())
    ):
        raise SchemaError("settings.json: 'env' muss ein String→String-Objekt sein.")
    if "hooks" in obj:
        validate_hooks(obj["hooks"])


def validate_hooks(obj: Any) -> None:
    if not isinstance(obj, dict):
        raise SchemaError("hooks: muss ein Objekt (Event → Liste) sein.")
    for event, entries in obj.items():
        if event not in _HOOK_EVENTS:
            raise SchemaError(f"hooks: unbekanntes Event '{event}'.")
        if not isinstance(entries, list):
            raise SchemaError(f"hooks.{event}: muss eine Liste sein.")
        for entry in entries:
            if not isinstance(entry, dict):
                raise SchemaError(f"hooks.{event}: Eintrag muss ein Objekt sein.")
            if "matcher" in entry and not isinstance(entry["matcher"], str):
                raise SchemaError(f"hooks.{event}: 'matcher' muss ein String sein.")
            handlers = entry.get("hooks")
            if not isinstance(handlers, list) or not handlers:
                raise SchemaError(f"hooks.{event}: 'hooks' muss eine nicht-leere Liste sein.")
            for h in handlers:
                _validate_hook_handler(event, h)


def _validate_hook_handler(event: str, h: Any) -> None:
    if not isinstance(h, dict):
        raise SchemaError(f"hooks.{event}: Handler muss ein Objekt sein.")
    htype = h.get("type")
    if htype not in _HOOK_HANDLER_TYPES:
        raise SchemaError(f"hooks.{event}: ungültiger Handler-type '{htype}'.")
    for key in h:
        if key not in _ALLOWED_HANDLER_KEYS:
            raise SchemaError(f"hooks.{event}: unbekanntes Handler-Feld '{key}'.")
    if htype == "command" and not h.get("command"):
        raise SchemaError(f"hooks.{event}: command-Handler braucht 'command'.")
    if htype == "http" and not h.get("url"):
        raise SchemaError(f"hooks.{event}: http-Handler braucht 'url'.")


def validate_agent_frontmatter(text: str) -> None:
    body = text.lstrip("﻿").lstrip()
    if not body.startswith("---"):
        raise SchemaError("agent: YAML-Frontmatter (--- am Anfang) fehlt.")
    parts = body.split("---", 2)
    if len(parts) < 3:
        raise SchemaError("agent: Frontmatter nicht geschlossen (zweites --- fehlt).")
    keys = set()
    for line in parts[1].splitlines():
        m = re.match(r"^([A-Za-z0-9_-]+)\s*:", line)
        if m:
            keys.add(m.group(1))
    unknown = keys - _ALLOWED_AGENT_FRONTMATTER
    if unknown:
        raise SchemaError(f"agent: unbekannte Frontmatter-Felder {sorted(unknown)}.")
    missing = _REQUIRED_AGENT_FRONTMATTER - keys
    if missing:
        raise SchemaError(f"agent: Pflichtfelder fehlen {sorted(missing)}.")


def validate_plugin(obj: Any) -> None:
    if not isinstance(obj, dict):
        raise SchemaError("plugin.json: muss ein Objekt sein.")
    for key in obj:
        if key not in _ALLOWED_PLUGIN_KEYS:
            raise SchemaError(f"plugin.json: unbekanntes Feld '{key}'.")
    if not obj.get("name"):
        raise SchemaError("plugin.json: 'name' fehlt.")


def validate_mcp(obj: Any) -> None:
    if not isinstance(obj, dict) or "mcpServers" not in obj:
        raise SchemaError(".mcp.json: braucht ein 'mcpServers'-Objekt.")
    servers = obj["mcpServers"]
    if not isinstance(servers, dict):
        raise SchemaError(".mcp.json: 'mcpServers' muss ein Objekt sein.")
    for name, spec in servers.items():
        if not isinstance(spec, dict):
            raise SchemaError(f".mcp.json: Server '{name}' muss ein Objekt sein.")
        transport = spec.get("type")
        if transport not in _MCP_TRANSPORTS:
            raise SchemaError(f".mcp.json: Server '{name}' hat ungültigen type '{transport}'.")
        # Keine Klartext-Secrets: Header/Env nur als ${ENV}-Referenz.
        blob = str(spec.get("headers", "")) + str(spec.get("env", ""))
        for token in re.findall(r"[Bb]earer\s+(\S+)", blob):
            if "${" not in token:
                raise SchemaError(f".mcp.json: Server '{name}' enthält ein Klartext-Secret.")
