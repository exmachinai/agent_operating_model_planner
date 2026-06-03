"""Erweiterte Negativ-/Edge-Tests für das hinterlegte Claude-Code-Schema.

Jeder Validator wird sowohl positiv (gültiges Artefakt passiert) als auch in
seinen Fehlerpfaden geprüft, sodass die Schema-Gate-Wirkung (CI rot bei falschem
Feld/Typ) lückenlos belegt ist. Rein in-process, kein Netz.
"""

from __future__ import annotations

import pytest

from app.harness import schema_check
from app.harness.schema_check import SchemaError


# --- validate_settings --------------------------------------------------------


def test_settings_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_settings(["nicht", "objekt"])


def test_settings_permissions_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_settings({"permissions": []})


def test_settings_unbekanntes_permissions_feld() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_settings({"permissions": {"erlaube_alles": True}})


def test_settings_allow_liste_muss_strings_sein() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_settings({"permissions": {"allow": [123]}})


def test_settings_env_muss_string_map_sein() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_settings({"env": {"K": 1}})


def test_settings_voll_gueltig_inkl_hooks() -> None:
    schema_check.validate_settings(
        {
            "model": "claude-sonnet-4-6",
            "env": {"FOO": "bar"},
            "permissions": {
                "defaultMode": "acceptEdits",
                "allow": ["Read"],
                "deny": [],
                "ask": ["Bash"],
            },
            "hooks": {
                "Stop": [
                    {"matcher": "*", "hooks": [{"type": "command", "command": "x"}]}
                ]
            },
        }
    )


# --- validate_hooks -----------------------------------------------------------


def test_hooks_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks([])


def test_hooks_event_eintraege_keine_liste() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks({"Stop": {"matcher": "*"}})


def test_hooks_eintrag_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks({"Stop": ["nicht-objekt"]})


def test_hooks_matcher_kein_string() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks(
            {"Stop": [{"matcher": 1, "hooks": [{"type": "command", "command": "x"}]}]}
        )


def test_hooks_leere_handler_liste() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks({"Stop": [{"matcher": "*", "hooks": []}]})


def test_hooks_handler_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks({"Stop": [{"matcher": "*", "hooks": ["x"]}]})


def test_hooks_unbekanntes_handler_feld() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks(
            {"Stop": [{"hooks": [{"type": "command", "command": "x", "foo": 1}]}]}
        )


def test_hooks_command_braucht_command() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks({"Stop": [{"hooks": [{"type": "command"}]}]})


def test_hooks_http_braucht_url() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks({"Stop": [{"hooks": [{"type": "http"}]}]})


def test_hooks_http_handler_gueltig() -> None:
    schema_check.validate_hooks(
        {"PostToolUse": [{"hooks": [{"type": "http", "url": "https://x"}]}]}
    )


# --- validate_agent_frontmatter ----------------------------------------------


def test_agent_frontmatter_fehlt_komplett() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_agent_frontmatter("# Kein Frontmatter\n")


def test_agent_frontmatter_nicht_geschlossen() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_agent_frontmatter("---\nname: x\ndescription: y\n")


def test_agent_frontmatter_pflichtfeld_fehlt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_agent_frontmatter("---\nname: x\n---\n# X\n")


def test_agent_frontmatter_gueltig_mit_bom() -> None:
    # BOM + alle erlaubten Felder -> passiert.
    schema_check.validate_agent_frontmatter(
        "﻿---\nname: x\ndescription: y\ntools: Read\nmodel: m\ncolor: blue\n---\n# X\n"
    )


# --- validate_plugin ----------------------------------------------------------


def test_plugin_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_plugin("nope")


def test_plugin_unbekanntes_feld() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_plugin({"name": "x", "phantasie": 1})


def test_plugin_name_fehlt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_plugin({"version": "1.0"})


def test_plugin_gueltig() -> None:
    schema_check.validate_plugin({"name": "x", "version": "1.0", "skills": []})


# --- validate_mcp -------------------------------------------------------------


def test_mcp_ohne_mcpservers() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_mcp({"foo": 1})


def test_mcp_servers_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_mcp({"mcpServers": []})


def test_mcp_server_spec_kein_objekt() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_mcp({"mcpServers": {"x": "nicht-objekt"}})


def test_mcp_ungueltiger_transport() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_mcp({"mcpServers": {"x": {"type": "carrier-pigeon"}}})


def test_mcp_gueltig_mit_env_referenz() -> None:
    # Bearer-Token als ${ENV}-Referenz ist erlaubt (kein Klartext-Secret).
    schema_check.validate_mcp(
        {
            "mcpServers": {
                "x": {
                    "type": "http",
                    "url": "https://x",
                    "headers": {"Authorization": "Bearer ${TOKEN}"},
                }
            }
        }
    )
