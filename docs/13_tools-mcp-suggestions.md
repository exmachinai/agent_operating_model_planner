# 13 · Werkzeug-/MCP-Vorschläge (Schritt 6b) + Bindung im Harness (Schritt 8)

Spec für die Werkzeug-Empfehlung im geführten Plan-Wizard (v0.5). Methodentreue:
ZGPM bleibt führend; Werkzeuge sind ein **Hilfsangebot**, kein Automatismus. Buyer-
Promise „evidence-based, audit-ready" → jeder Vorschlag trägt einen **Trust-Hinweis**
(Least-Privilege) und wird vom Anwender **bewusst angenommen oder verworfen**.

## Warum

Der Anwender ist oft Laie und kennt MCP/Tools nicht. Statt ihn Werkzeuge „aus dem
Nichts" wählen zu lassen, **leitet das System je Aktivität passende Kandidaten ab**
und erklärt sie in einfacher Sprache: *was* das Werkzeug tut, *warum* es hier passt,
*welche* Daten/Rechte es braucht.

## Datenmodell

`ToolSuggestion` (in `planner/api/app/schemas/plan.py`) hängt an jeder `Activity`:

| Feld | Bedeutung |
|---|---|
| `name` | stabiler Slug (z. B. `github-mcp`) — auch im Harness-Export verwendet |
| `kind` | `tool` oder `mcp` |
| `label` | Anzeigename (z. B. „GitHub (Code & Repos)") |
| `what_it_does` | eine Klartext-Zeile für Laien |
| `why_suggested` | Bezug zur konkreten Aktivität |
| `trust_note` | Daten-/Rechte-Hinweis (Least-Privilege) |
| `accepted` | vom Anwender angenommen? |

## Vorschlagsquelle

1. **LLM** (Azure Foundry, `planning/llm_planner.py`) — projektspezifisch, im selben
   Aufruf wie die Aktivitäts-Gliederung.
2. **Deterministischer Fallback** (`planning/tool_catalog.py`) — kuratierter Katalog
   mit Keyword→Werkzeug-Mapping; greift ohne Creds oder bei LLM-Fehler. Liefert nie
   eine leere Liste (sinnvolle Defaults), damit der Anwender immer eine Wahl hat.

Der Katalog ist bewusst klein und generisch (Web-Recherche, GitHub-MCP, Dateien-MCP,
Dokument-Ersteller, Datenanalyse, Prüf-Helfer, Ticket-MCP). Erweiterbar an einer Stelle.

## UI (Schritt 6b)

Unter jeder Aktivität erscheinen die Vorschläge als **Chips** mit „?"-Klartext-
Erklärung und „Übernehmen"/„Entfernen". Angenommene Werkzeuge sind grün markiert.
Bearbeitung läuft über `POST /plan/activities/op` mit `tool_id` + `tool_accepted`.

## Bindung im Harness (Schritt 8)

Die in 6b **angenommenen** Werkzeuge stehen beim Agenten-Bau bereit und werden je
Agent zugewiesen (Trust-Layer-Check für High-Risk-Tools → HITL). Sie fließen in den
Harness-Export. Slug-Konsistenz (`name`) verbindet Plan-Vorschlag und Harness-Tool.

## Nicht-Ziele

- Keine automatische Aktivierung von Werkzeugen ohne Zustimmung.
- Keine breiten Rechte: Trust-Hinweise benennen Least-Privilege-Scope.
- Keine 100%-Claims zur Werkzeug-Eignung — es bleibt ein begründeter Vorschlag.
