# 00 — Overview

Dieses Dokument gibt den **Gesamtüberblick** über den AEGIRA Agent Operating Model Planner. Die anderen `docs/`-Dokumente vertiefen einzelne Bausteine.

## Lese-Reihenfolge

1. **`00_overview.md`** — dieses Dokument (Big Picture, Bausteine, Datenfluss).
2. **`01_zgpm-method.md`** — die zugrundeliegende Projektmanagement-Methodik (ZGPM, PwC/Glasner).
3. **`02_architecture-option-b.md`** — Azure-native App-Architektur des Planners (Planning Agent Board).
4. **`03_harness-zip-spec.md`** — Spezifikation des portablen Agent-Harness-Artefakts.

## Vision

Ein **Project-to-Agent-Compiler**: Aus einem Projektauftrag entstehen über mehrere methodisch saubere Stufen ein vollständiger, lauffähiger Agentensystem-Bauplan und das zugehörige Harness-Zip.

```
Projektauftrag (Brief)
  │
  ▼
Planning Agent Board (Azure-native)
  ├─ PMO-Agent          → schlägt Phasen & Meilensteine vor
  ├─ Architecture-Agent → schlägt Rollenmodell & PVM vor
  ├─ Skill-Mapping-Agent → leitet Skill-Bedarfe ab
  ├─ Risk-Agent         → befüllt Projekt-/Meilenstein-Risikolisten
  └─ Reviewer-Agent     → prüft ZGPM-/McK-Konsistenz
  │
  ▼  (jede Stufe: Human-in-the-Loop-PM)
  │
ZGPM-Plan (Single Source of Truth, versioniert)
  ├─ Meilensteinplan (MSP)
  ├─ Projektverantwortlichkeitsmatrix (PVM)
  ├─ Aktivitätenpläne je Meilenstein
  ├─ Projekt- und Meilenstein-Risikolisten
  └─ Phasen + Ergebnispfade
  │
  ▼
Harness-Compiler
  │
  ▼
Portables Agent-Harness-Zip
  ├─ CLAUDE.md
  ├─ PROJECT_PLAN.md / MILESTONES.md / RACI.md
  ├─ .claude/agents/<rolle>.md  (aus PVM)
  ├─ .claude/skills/<skill>.md  (aus Skill-Matrix)
  └─ langgraph/graph.py         (MSP als State-Machine)
  │
  ▼
Runtime (auf beliebigem Rechner)
```

## Die drei Bausteine im Repo

### 1. `planner/` — Azure-native App

Web-App, in der der Human-in-the-Loop-Projektleiter mit den fünf Planungsagenten zusammenarbeitet. **Kern-Design-Entscheidungen:**

- **Stack**: Azure Container Apps + Azure AI Foundry / Azure OpenAI in EU-Region (Sweden Central oder West Europe).
- **Datenspeicher**: Cosmos DB (EU, Customer-Managed-Keys), Plan als Event-Sourced-Append-Log.
- **Identity**: Entra ID.
- **Single Source of Truth**: ZGPM-Plan als YAML/JSON in Cosmos. Export jederzeit als Excel + YAML + Zip möglich (Lock-in-Vermeidung).
- **In-App-Hilfe**: ZGPM-Glossar, kontextuelle Tooltips, „Frag den Methodik-Coach"-Chat.

Detail-Spec: `docs/02_architecture-option-b.md`.

### 2. `harness/_template/` — Agent-Harness-Artefakt

Das **portable Endprodukt** des Planners. Wird vom Compiler aus dem ZGPM-Plan erzeugt und ist auf jedem Rechner lauffähig (Claude-Code, LangGraph, Docker). **Eigenschaften:**

- Keine API-Keys im Klartext — nur `.env.example`.
- Keine Azure-spezifischen Abhängigkeiten (läuft offline-fähig).
- Optional lokale LLMs (Ollama) als Fallback.
- Audit-Trail über Git-History.

Detail-Spec: `docs/03_harness-zip-spec.md`.

### 3. `mcp/github-pat-mcp-server/` — GitHub-PAT-MCP-Server

Hilfs-Baustein. **Warum nötig:** Der offizielle Anthropic-GitHub-Connector (`plugin:engineering:github`) verlangt dynamische OAuth-Client-Registrierung und funktioniert in Cowork nicht. Lösung: eigener stdio-MCP mit Fine-Grained-PAT.

Wird von Claude-Code / Cowork in der **Entwicklung** dieses Repos genutzt — und später auch vom Planner-App-Compiler, um Harness-Zips automatisch in Kunden-GitHub-Orgs zu pushen.

Detail-Spec: `mcp/github-pat-mcp-server/README.md`.

## Methodische Grundlagen

| Methodik | Quelle | Wofür |
|---|---|---|
| **ZGPM** | PwC (Glasner et al.), seit 2003 etabliert | Vokabular: Meilenstein, Aktivität, Ergebnispfad, PVM, Phase, Risiko-Ampel |
| **McKinsey** | MECE · Pyramid Principle · Hypothesis-driven | Strukturqualität, Statusberichte, Aktivitätengestaltung |
| **AEGIRA-Constitution** | exmachinAI Knowledge-Repo | Inhaltliche Norm, Buyer-Promise, Rechtsräume, Produktnamen |
| **AIMS** | ISO 42001 × CMMI v3 | Maturity-Modell für AI-Governance (nicht MITRE, nicht GMS) |

## Wer arbeitet hier mit

| Rolle | Mensch oder Agent | Aufgabe |
|---|---|---|
| Projektleiter (PM) | **Mensch** | HITL-Eskalationsknoten, hartes Sign-off pro Meilenstein |
| PMO-Agent | Agent | Phasen, Meilensteine, Aktivitätenstruktur |
| Architecture-Agent | Agent | Rollen, PVM-Vorschläge |
| Skill-Mapping-Agent | Agent | Skill-Bedarfe je Aktivität, `SKILL.md`-Stubs |
| Risk-Agent | Agent | PRL/MRL aus Anti-Pattern-Bibliothek |
| Reviewer-Agent | Agent | Konsistenzprüfungen (ZGPM-Regeln, McK-MECE-Test) |
| Methodology-Guard-Agent | Agent | ZGPM-/McK-Treue-Enforcement (optional, später) |
| Compliance-Agent | Agent | EU AI Act / ISO 42001 Checks (optional, später) |

## Was hart-HITL bleibt

Drei Stellen, an denen der Mensch nicht übersteuert werden darf:

1. **Meilenstein-Sign-off** — jeder Übergang erfordert manuelle Bestätigung.
2. **Rote Risikoampel** — Run stoppt, HITL muss explizit override geben.
3. **`SKILL.md`-Aufnahme ins Harness** — jede neue Skill-Datei braucht HITL-Review.

## Was es NICHT sein darf

- Keine PwC-/ZGPM-Marken-Verwechslung — die Methode wird methodisch genutzt, Markenrechte werden nicht beansprucht.
- Keine 100%-Garantien — Constitution-konform: „nachvollziehbar McK-methodisch aufgebaut" statt „garantiert McK-konform".
- Kein „DACH" — Rechtsräume sind `DE` · `EU27-Rest` · `UK` · `CH`.
- Kein Vendor-Lock-in — Plan und Harness sind jederzeit ohne den Planner exportier- und lauffähig.
- Keine Hard-Coded-Personas — die echten Personen stehen im USER-REGISTRY im Knowledge-Repo.
