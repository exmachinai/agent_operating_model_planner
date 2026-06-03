# Findings → Umsetzungsplan — P0-Slice v0.9.5 (2026-06-03)

Ergebnis der P0-Test-Durchführung (Teststrategie §14/§17). Suite-Stand: **98 passed,
1 xfailed**. Behoben im selben Lauf: Versions-Drift (VER-PARITY). Offen: 1 P1-Produkt-
Finding (CG-6, eng begrenzt), 1 dokumentierte Eigenschaft (INV-7-Provenance).
Hinweis: „AEGIRA" (Plattformname) ist Positivliste/erlaubt — nur interne Produktnamen sind extern zu strippen.

## Behoben in diesem Lauf

| ID | Quelle | Severity | Bucket | Datei | Root-Cause | Fix | Re-Test (grün) | Status |
|----|--------|----------|--------|-------|-----------|-----|----------------|--------|
| F-VER | VER-PARITY | P0 | Konsistenz | `app/config.py:18`, `app/harness/compiler.py:44` | `app_version=0.9.2` und `_COMPILER_ID=@0.9.0` driften gegen `package.json=0.9.4` | Beide auf `0.9.4` gesetzt | `test_version_parity.py::*` (5/5) | ✅ geschlossen |

## Offen — adressieren

### F-CG6 (P1, Kundenschutz) — interne Produktnamen im Externdeliverable
- **Quelle:** CG-6 (`test_constitution_guards.py::test_cg6_external_deliverable_free_of_internal_product_names`, `xfail`).
- **Klarstellung (Policy):** Der **Plattformname „AEGIRA" ist auf der Positivliste** und in
  Deliverables erlaubt — auch extern. Geprüft/zu strippen sind nur die **kommerziellen
  Produktnamen** (AI Navigator/Guardian/Commander = interne Constitution).
- **Befund:** Bei `aegira_internal=False` enthält das Deliverable **eine** Stelle mit
  internen Produktnamen — `HANDOVER.md`, Zeile „AIMS-Maturity · Produktnamen AI
  Navigator/Guardian/Commander · keine Secrets …" (Constitution-Erinnerung). Der
  `apply_preferences`-Gate greift hier nicht.
- **Betroffen:** `app/harness/templates.py` (`handover_md` — Constitution-/Produktnamen-Block),
  ggf. weitere Constitution-Erinnerungen; Gate-Flag `project.apply_preferences`.
- **Root-Cause-Hypothese:** Die HANDOVER-Constitution-Zeile ist statisch, unabhängig von
  `apply_preferences` gerendert.
- **Fix-Maßnahme:** Bei `apply_preferences=False` den Constitution-/Produktnamen-Block in
  `handover_md` (und etwaige weitere Reminder) weglassen. „AEGIRA"-Tool-Branding bleibt.
- **Re-Test:** `test_cg6_external_deliverable_free_of_internal_product_names` von `xfail` → `pass`.
- **Aufwand:** S. **Severity:** P1 (R2) — eng begrenzt (eine HANDOVER-Zeile).

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
**Nächstes Inkrement:** F-CG6 fixen → CG-6 grün; danach P1 (E2E/Playwright, Persona U1–U7).
