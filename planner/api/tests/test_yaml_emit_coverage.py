"""Erweiterte Unit-Tests für den abhängigkeitsfreien YAML-Emitter.

Deckt gezielt die Verzweigungen ab, die der Compiler erzeugt: leere und gefüllte
Listen/Dicts auf Top-Level, in Dicts und innerhalb von Listen-Items (erstes Feld
neben dem Bindestrich, restliche Felder eingerückt). Deterministisch, kein Netz.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.harness import yaml_emit


def test_scalar_floats_und_datetime() -> None:
    """Float wird als Zahl serialisiert; datetime als ISO-8601, nicht gequotet."""
    dt = datetime(2026, 1, 1, 12, 30, tzinfo=timezone.utc)
    out = yaml_emit.dump({"ratio": 1.5, "ts": dt})
    assert "ratio: 1.5" in out
    assert "ts: 2026-01-01T12:30:00+00:00" in out


def test_scalar_escaping_backslash_quote_newline() -> None:
    """Backslash, Anführungszeichen und Zeilenumbruch werden robust escaped."""
    out = yaml_emit.dump({"k": 'pfad\\sub "x"\nzeile2'})
    assert 'k: "pfad\\\\sub \\"x\\"\\nzeile2"' in out


def test_top_level_leeres_dict() -> None:
    """Komplett leeres Dict auf Top-Level -> `{}`."""
    assert yaml_emit.dump({}).strip() == "{}"


def test_top_level_list_und_skalar() -> None:
    """Top-Level-Liste und Top-Level-Skalar laufen über die nicht-dict-Zweige."""
    assert yaml_emit.dump(["a", "b"]).splitlines() == ['- "a"', '- "b"']
    assert yaml_emit.dump("nur-skalar").strip() == '"nur-skalar"'


def test_dict_mit_leerer_und_gefuellter_liste_und_dict() -> None:
    """Im Dict: leere Liste -> `[]`, leeres Dict -> `{}`, gefülltes Dict verschachtelt."""
    out = yaml_emit.dump(
        {
            "leere_liste": [],
            "leeres_dict": {},
            "tags": ["x"],
            "nested": {"a": 1},
        }
    )
    assert "leere_liste: []" in out
    assert "leeres_dict: {}" in out
    assert "tags:" in out and '- "x"' in out
    assert "nested:" in out and "a: 1" in out


def test_list_item_erstes_feld_dict_und_liste() -> None:
    """Listen-Item, dessen erstes Feld ein gefülltes Dict bzw. eine Liste ist."""
    out = yaml_emit.dump(
        {
            "items": [
                {"meta": {"k": "v"}, "rest": 1},      # erstes Feld = gefülltes Dict
                {"vals": ["a", "b"], "name": "z"},    # erstes Feld = gefüllte Liste
            ]
        }
    )
    assert "- meta:" in out
    assert "k: \"v\"" in out
    assert "rest: 1" in out
    assert "- vals:" in out
    assert 'name: "z"' in out


def test_list_item_leeres_dict_und_leere_kollektionen_in_rest() -> None:
    """Listen-Item mit leerem Dict; Rest-Feld mit leerer Liste.

    Hinweis: Anders als auf Top-Level hat der Rest-Feld-Zweig in `_emit_list`
    keinen Sonderfall für ein leeres Dict — es fällt bewusst auf den Skalar-Zweig
    (`"{}"`). Dieser Test fixiert das tatsächliche, deterministische Verhalten.
    """
    out = yaml_emit.dump({"items": [{}, {"id": "M1", "leer": [], "leerd": {}}]})
    assert "- {}" in out
    assert '- id: "M1"' in out
    assert "leer: []" in out
    assert 'leerd: "{}"' in out


def test_list_item_rest_feld_dict_und_liste() -> None:
    """Listen-Item, dessen Folgefelder ein gefülltes Dict bzw. eine Liste sind."""
    out = yaml_emit.dump(
        {"items": [{"id": "M1", "meta": {"a": 1}, "tags": ["t"]}]}
    )
    assert '- id: "M1"' in out
    # Folge-Dict eingerückt unter dem Item.
    assert "meta:" in out and "a: 1" in out
    # Folge-Liste eingerückt unter dem Item.
    assert "tags:" in out and '- "t"' in out


def test_list_item_erstes_feld_leere_liste() -> None:
    """Listen-Item, dessen erstes Feld eine leere Liste ist -> `- feld: []`."""
    out = yaml_emit.dump({"items": [{"leer": [], "id": "M1"}]})
    assert "- leer: []" in out
    assert 'id: "M1"' in out
