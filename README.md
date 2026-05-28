# AEGIRA — Agent Operating Model Planner

> **ZGPM-konformer Projekt-Planner für hybride Human-Agent-Organisationen.**
> Erzeugt aus einem Projektauftrag einen methodisch sauberen Plan und kompiliert ihn zu einem portablen Agent-Harness.

---

## Was ist das?

Ein Mono-Repo mit drei Bausteinen, die zusammen eine vollständige **Plan → Harness → Run**-Kette bilden:

| Baustein | Pfad | Rolle |
|---|---|---|
| **Planner App** (Azure-native) | `planner/` | Web-App: 5 Planungs-Agenten + Human-in-the-Loop-PM erzeugen kollaborativ einen ZGPM-konformen Plan (MSP, PVM, Aktivitätenpläne, Risiken). |
| **Agent-Harness Template** | `harness/_template/` | Portables Zip-Artefakt: `.claude/agents`, `.claude/skills`, `CLAUDE.md`, `langgraph/graph.py`, Run-Scripts. Wird vom Planner für das jeweilige Projekt erzeugt. |
| **GitHub-PAT-MCP-Server** | `mcp/github-pat-mcp-server/` | Eigener MCP-Server (TypeScript, stdio, Fine-Grained-PAT), damit Cowork / Claude-Code mit GitHub arbeiten kann, ohne auf den OAuth-blockierten Standard-Connector angewiesen zu sein. |

## Warum überhaupt?

Das Problem: Wer heute Agenten baut, startet **technisch** (Prompt → Tool → Workflow). Was fehlt, ist die **organisatorische** Vorarbeit: Projektplan, Rollen, RACI, Skills, Governance. Solo-Builder haben keine Projektteams, keine Kick-offs, keine Architektur-Workshops — und damit fehlt die organisatorische Intelligenz, aus der gute Agentensysteme entstehen.

Die Lösung: Eine Pipeline, die aus einem Projektauftrag einen methodisch sauberen Plan macht und daraus einen lauffähigen Agent-Harness kompiliert.

```
Projektauftrag
  → ZGPM-Plan (MSP · PVM · Aktivitätenpläne · Risiken · Phasen)
  → Skill-Matrix
  → Subagent-Architektur
  → Harness-Zip (CLAUDE.md · SKILL.md · LangGraph)
  → Runtime
```

## Methodische Grundlagen

- **ZGPM** — „ZielGerichtetes Projekt-Management" (PwC, Glasner et al.). Liefert das Vokabular: Meilenstein, Aktivität, Ergebnispfad, PVM, Phase. Details in [`docs/01_zgpm-method.md`](docs/01_zgpm-method.md).
- **McKinsey-Methodentreue** — MECE-Strukturierung, Pyramid Principle in jedem Meilenstein-Status, Hypothesis-driven Aktivitäten.
- **AEGIRA-Constitution** — Trust-Infrastructure, keine 100%-Claims, Rechtsräume DE/EU27-Rest/UK/CH, AIMS als Maturity-Modell, Produktlinie Navigator/Guardian/Commander.

## Setup für Entwickler

```bash
git clone git@github.com:exmachinai/agent_operating_model_planner.git
cd agent_operating_model_planner

# MCP-Server bauen (für Cowork-/Claude-Code-Integration)
cd mcp/github-pat-mcp-server
cp .env.example .env       # Token eintragen
npm install
npm run build
```

Detail-Setups je Baustein in den jeweiligen Unter-READMEs.

## Status

| Baustein | Status |
|---|---|
| Mono-Repo-Skeleton | bootstrapping |
| GitHub-PAT-MCP-Server | implementing (Phase 2/4) |
| Harness Template | spec |
| Planner App | spec |

Aktueller Backlog siehe Issues (sobald Repo auf GitHub angelegt ist).

## Lizenz

[Apache-2.0](LICENSE) — siehe `LICENSE`.

## Kontakt

exmachinAI GmbH · [github.com/exmachinai](https://github.com/exmachinai)
