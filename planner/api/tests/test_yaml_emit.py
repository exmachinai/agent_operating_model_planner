"""Unit-Tests für den abhängigkeitsfreien YAML-Emitter (Harness-Plan-Dateien)."""

from __future__ import annotations

from app.harness import yaml_emit


def test_scalars_and_quoting() -> None:
    out = yaml_emit.dump({"a": "wert: mit doppelpunkt", "b": 3, "c": True, "d": None})
    assert 'a: "wert: mit doppelpunkt"' in out
    assert "b: 3" in out
    assert "c: true" in out
    assert "d: null" in out


def test_nested_list_of_dicts() -> None:
    data = {"items": [{"id": "M01", "tags": ["x", "y"]}, {"id": "M02", "tags": []}]}
    out = yaml_emit.dump(data)
    assert "items:" in out
    assert '- id: "M01"' in out
    assert "tags:" in out
    assert '- "x"' in out
    assert "tags: []" in out


def test_empty_dict() -> None:
    assert yaml_emit.dump({"m": {}}).strip() == "m: {}"
