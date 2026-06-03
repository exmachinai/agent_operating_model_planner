# Findings → Umsetzungsplan — P0-Slice v0.9.5 (2026-06-03)

Ergebnis der P0+P1+P2-Test-Durchführung (Teststrategie §14/§17). Suite-Stand:
**117 passed, 0 xfailed** (76 Baseline → +41). Behoben: F-VER (Versions-Drift),
F-CG6 (markenfreies Externdeliverable), F-RES2 (Gate-3-Idempotenz). Offen: nur
1 dokumentierte Eigenschaft (INV-7-Provenance, kein Defekt).
Hinweis: „AEGIRA" (Plattformname) ist Positivliste/erlaubt — nur interne Produktnamen waren extern zu strippen.

## Behoben in diesem Lauf

| ID | Quelle | Severity | Bucket | Datei | Root-Cause | Fix | Re-Test (grün) | Status |
|----|--------|----------|--------|-------|-----------|-----|----------------|--------|
| F-VER | VER-PARITY | P0 | Konsistenz | `app/config.py:18`, `app/harness/compiler.py:44` | `app_version=0.9.2` und `_COMPILER_ID=@0.9.0` driften gegen `package.json=0.9.4` | Beide auf `0.9.4` gesetzt | `test_version_parity.py::*` (5/5) | ✅ geschlossen |
| F-CG6 | CG-6 | P0→behoben | Kundenschutz | `app/harness/templates.py::handover_md` | HANDOVER-Leitplanken-Zeile nennt interne Produktnamen unabhängig von `apply_preferences` (Plattformname „AEGIRA" = Positivliste, bleibt) | Produktnamen-Segment via `project.apply_preferences` gegated (konsistent zu `claude_md`); zudem neutraler Plugin-Namespace/Devcontainer/Attribution extern | `test_cg6_external_deliverable_is_brand_neutral` + `…internal_with_preferences_keeps_product_names` + IT-Devcontainer | ✅ geschlossen |
| F-RES2 | RES-2 | P1→behoben | Resilienz | `app/routers/harness.py::approve_harness` | Gate 3 hatte KEINEN Doppel-Approve-Schutz → erneuter Freeze stempelt Zip-Hash/Zeitstempel neu (nicht idempotent) | 409-Guard bei `gate3_approved_at is not None` (konsistent zu Gate 1/2) | `test_resilience_secleak.py::test_res2_gate3_double_approve_409` | ✅ geschlossen |

## Offen / dokumentiert

### F-INV7 (P3, Doku/Bewusstsein) — Audit-Zeitstempel bricht byte-Reproduzierbarkeit
- **Quelle:** INV-7 (`test_inv7_compile_reproducible_except_audit_timestamp`).
- **Befund:** Re-Compile desselben Plans ist bit-identisch **bis auf**
  `plan/_version.json:compiled_at` (Wall-Clock). Innerhalb eines eingefrorenen Harness
  (Gate 3) ist der Hash stabil — kein Funktionsdefekt.
- **Bewertung:** **By-Design-Provenance** (Audit: Wann kompiliert?), kein Bug. Test
  belegt Determinismus „modulo Zeitstempel". Optionaler Härtegrad: `SOURCE_DATE_EPOCH`-
  Override für reproducible builds, falls je byte-Reproduzierbarkeit gefordert wird.
- **Status:** dokumentiert, kein Handlungsbedarf P0/P1.

## Loop-Regel (§17)
Kein Fix ohne grünen Re-Test · P0 stoppt Release · Severity an Risk-Score (§1) gekoppelt.
**Nächstes Inkrement:** P1 (E2E/Playwright T0–J7, Persona U1–U7), dann A11y/Visual + Mutation.
