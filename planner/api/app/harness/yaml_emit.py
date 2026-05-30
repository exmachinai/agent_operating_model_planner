"""Minimaler, abhängigkeitsfreier YAML-Emitter für die Harness-Plan-Dateien.

Bewusst klein: er deckt genau die Typen ab, die der Compiler erzeugt (str, int,
float, bool, None, datetime, list, dict). Kein PyYAML im API-Container nötig.
Strings werden konservativ gequotet, damit Sonderzeichen (Doppelpunkt, '#', '"')
nie das Dokument zerbrechen.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any


def _scalar(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    text = str(value)
    # Immer doppelt quoten: robust gegen ':', '#', führende Sonderzeichen, leer.
    escaped = text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def _emit(value: Any, indent: int, lines: list[str]) -> None:
    pad = "  " * indent
    if isinstance(value, dict):
        if not value:
            lines.append(f"{pad}{{}}")
            return
        for key, val in value.items():
            if isinstance(val, dict) and val:
                lines.append(f"{pad}{key}:")
                _emit(val, indent + 1, lines)
            elif isinstance(val, list) and val:
                lines.append(f"{pad}{key}:")
                _emit_list(val, indent, lines)
            elif isinstance(val, list):
                lines.append(f"{pad}{key}: []")
            elif isinstance(val, dict):
                lines.append(f"{pad}{key}: {{}}")
            else:
                lines.append(f"{pad}{key}: {_scalar(val)}")
    elif isinstance(value, list):
        _emit_list(value, indent, lines)
    else:
        lines.append(f"{pad}{_scalar(value)}")


def _emit_list(items: list[Any], indent: int, lines: list[str]) -> None:
    pad = "  " * indent
    for item in items:
        if isinstance(item, dict):
            # Erstes Feld neben den Bindestrich, Rest eingerückt.
            keys = list(item.keys())
            if not keys:
                lines.append(f"{pad}- {{}}")
                continue
            first, *rest = keys
            fv = item[first]
            if isinstance(fv, dict) and fv:
                lines.append(f"{pad}- {first}:")
                _emit(fv, indent + 2, lines)
            elif isinstance(fv, list) and fv:
                lines.append(f"{pad}- {first}:")
                _emit_list(fv, indent + 1, lines)
            elif isinstance(fv, list):
                lines.append(f"{pad}- {first}: []")
            else:
                lines.append(f"{pad}- {first}: {_scalar(fv)}")
            for key in rest:
                val = item[key]
                if isinstance(val, dict) and val:
                    lines.append(f"{pad}  {key}:")
                    _emit(val, indent + 2, lines)
                elif isinstance(val, list) and val:
                    lines.append(f"{pad}  {key}:")
                    _emit_list(val, indent + 1, lines)
                elif isinstance(val, list):
                    lines.append(f"{pad}  {key}: []")
                else:
                    lines.append(f"{pad}  {key}: {_scalar(val)}")
        else:
            lines.append(f"{pad}- {_scalar(item)}")


def dump(data: dict[str, Any]) -> str:
    """Serialisiert ein dict als YAML-Dokument (mit abschließendem Newline)."""
    lines: list[str] = []
    _emit(data, 0, lines)
    return "\n".join(lines) + "\n"
