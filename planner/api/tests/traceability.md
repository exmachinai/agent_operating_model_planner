# Traceability-Matrix (Anforderung → Test) — Teststrategie §11

Jede P0-Anforderung (inkl. Constitution-Eckpfeiler) hat ≥1 Beleg-Test. Stand: P0-Slice
v0.9.5 umgesetzt. Spätere Inkremente (E2E/Playwright, A11y, Mutation) ergänzen die
offenen Zeilen.

| Anforderung / Eckpfeiler | Risk | Test-ID(s) | Status |
|---|---|---|---|
| Versions-Konsistenz (config == package.json == compiler == /health) | R5 | `test_version_parity.py::*` | ✅ |
| Gate-1-Pflichtfeld `project_nature` | R4 | `test_gate1_preference_guard.py::test_approve_blocked_without_project_nature` | ✅ |
| Gate-1-Pflichtfeld `aegira_internal` (Preference-Drift-Guard) | R2 | `test_gate1_preference_guard.py::test_approve_blocked_without_aegira_internal` | ✅ |
| Externprojekt → keine AEGIRA-Preferences (`use_preferences=False`) | R2 | `test_gate1_preference_guard.py::test_aegira_internal_false_disables_preferences` | ✅ |
| Kein „DACH" im Deliverable (CG-1/CG-4) | R2 | `test_constitution_guards.py::test_cg1_no_dach_anywhere` | ✅ |
| Keine 100%-Claims (CG-2) | R2 | `test_constitution_guards.py::test_cg2_no_positive_hundred_percent_claim` | ✅ |
| Produktnamen eingefroren (CG-3) | R2 | `test_constitution_guards.py::test_cg3_no_invented_product_names` | ✅ |
| Maturity = AIMS, nicht MITRE/GMS (CG-5) | R2 | `test_constitution_guards.py::test_cg5_aims_not_mitre_gms_as_primary` | ✅ |
| Kundendeliverable ohne interne Produktnamen (CG-6; „AEGIRA" = Positivliste) | R2 | `test_constitution_guards.py::test_cg6_external_deliverable_free_of_internal_product_names`, `::test_cg6_internal_with_preferences_keeps_product_names` | ✅ (F-CG6 behoben) |
| Prompt-Injection als Daten, nicht Anweisung (PINJ-1) | R3 | `test_security.py::test_pinj1_injection_is_data_not_instruction` | ✅ |
| Injection leckt nicht in Deliverables (PINJ-2) | R3 | `test_security.py::test_pinj2_injection_does_not_leak_into_deliverables` | ✅ |
| Kein Fremd-/Unbekannt-Projektzugriff (AUTHZ-1) | R7 | `test_security.py::test_authz1_unknown_project_404`, `::test_authz1_foreign_project_mutation_404` | ✅ (Stub-Tenant) |
| LLM-Ausfall → Mock-Fallback, kein 500 (RES-1) | R9 | `test_security.py::test_res1_no_foundry_mock_fallback_no_500` | ✅ |
| Determinismus Export (INV-7, gleicher Graph) | R1/R6 | `test_compiler_properties.py::test_inv7_build_zip_is_deterministic` | ✅ |
| Determinismus Re-Compile (modulo Audit-Zeitstempel) | R1/R6 | `test_compiler_properties.py::test_inv7_compile_reproducible_except_audit_timestamp` | ✅ |
| Graph-Kernstruktur (Orchestrator/Evaluator/HITL, INV-5) | R1 | `test_compiler_properties.py::test_inv5_graph_core_structure` | ✅ |
| Stabile Knoten-Reihenfolge | R1 | `test_compiler_properties.py::test_node_order_is_stable` | ✅ |
| Runtime-Schema-Treue (Hooks/settings) | R1 | `test_harness_schema.py::*` (bestehend) | ✅ |
| Gate-Reihenfolge/HITL (Compile erst nach Gate 2, Gate-3-Freeze) | R6 | `test_harness.py::test_compile_requires_gate2`, `::test_gate3_freezes_and_blocks_revision` | ✅ |
| Export-Integrität (checksums round-trip) | R6 | `test_harness.py::test_download_zip_integrity` | ✅ |
| Iterations-Cap (INV-8, MAX_HARNESS_ITERATIONS) | R1 | `test_invariants_extended.py::test_inv8_iteration_cap_returns_409` | ✅ |
| Absolute Pfade $HARNESS_ROOT (INV-6) | R1 | `…::test_inv6_absolute_paths_in_claude_md` | ✅ |
| Anti-Muster sichtbar (INV-10) | R1 | `…::test_inv10_anti_patterns_are_visible_as_findings` | ✅ |
| Rote Ampel → stop-on-red (INV-4) | R1 | `…::test_inv4_stop_on_red_hook_present` | ✅ |
| Skill-Manifest/Trust-Tier (INV-11) | R1 | `…::test_inv11_skill_manifest_has_trust_and_gate` | ✅ |
| Doppel-Approve idempotent (RES-2, alle Gates) | R9 | `test_resilience_secleak.py::test_res2_gate{1,2,3}_*` | ✅ |
| Keine Klartext-Secrets / deny Read(.env) (SEC-LEAK) | R3 | `test_resilience_secleak.py::test_secleak_*` | ✅ |
| Slug-Eigenschaften (Property-based) | R1 | `test_property_hypothesis.py::*` (hypothesis) | ✅ |
| Struktur-Golden (Drift-Erkennung) | R1 | `test_golden_structure.py` (syrupy) | ✅ |
| Mutation-Score Compiler ≥75 % | R1 | `setup.cfg` (mutmut, CI-Job) | ⚙️ konfiguriert |
| Deploy-Parität + Erreichbarkeit (T0) | R1 | `e2e/tests/t0_parity.spec.ts` (Playwright) | ✅ scaffold |

## Offen (spätere Inkremente)
- E2E-Journeys J1–J7 + Persona U1–U7 (§9) · A11y/Visual/Lighthouse (§10) — Scaffold + Backlog in `planner/e2e/`.
- mutmut-Vollkampagne als CI-Job (Score-Gate ≥75 %).
- Echte Tenant-Isolation (AUTHZ über echte Multi-Tenancy statt Stub).
- INV-9 „Evaluator max. 3 Runden" ist Prompt-Constraint (nicht API-enforced) — Doku-Finding.
