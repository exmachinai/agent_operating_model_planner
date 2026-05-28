# <project_slug> — Agent Harness

> Ausführbarer ZGPM-Projektplan. Kompiliert vom **AEGIRA Agent Operating Model Planner**.
> **Runtime: Claude Code.** Der Harness läuft in Claude Code — dort werden Subagenten gespawnt, Skills aktiviert, Hooks gefeuert.
> **Installation + Support: Cowork.** Cowork installiert Claude Code, verbindet Tokens, mountet den Ordner, beantwortet Fragen und troubleshootet.

## Schnellstart (empfohlen: via Cowork)

In Cowork:

```
/install-harness ~/Downloads/<project_slug>.harness.zip
```

Cowork führt durch Integritäts-Check, Claude-Code-Installation, Auth, MCP-Setup, `.env`, Plan-Validierung und startet den ersten `/run-harness --dry-run`. Du musst nichts auf der Kommandozeile machen.

## Schnellstart (manuell, nur Claude Code)

```bash
# 1. Integrität prüfen (optional)
shasum -a 256 -c checksums.txt

# 2. Konfiguration
cp .env.example .env
# .env editieren — ANTHROPIC_API_KEY oder claude auth login

# 3. Run
claude
> /run-harness
```

**Pflichtlektüre vor dem ersten Run:**

1. [`INSTALL.md`](INSTALL.md) — vollständige Installation (5 Min)
2. [`USERGUIDE.md`](USERGUIDE.md) — Bedienung und Konzepte
3. [`CLAUDE.md`](CLAUDE.md) — Operating Instructions (wird automatisch geladen)

## Inhalt dieses Harness

| Pfad | Inhalt |
|---|---|
| `plan/` | ZGPM-Plan (MSP, PVM, Aktivitäten, Risiken) als versionierte YAML |
| `CLAUDE.md` | Main-System-Prompt |
| `.claude/agents/` | Subagent-Definitionen |
| `.claude/skills/` | Wiederverwendbare Fähigkeiten |
| `.claude/commands/` | Slash-Commands (`/run-harness`, `/validate-plan`, …) |
| `.claude/hooks/` | Deterministische Enforcement-Regeln |
| `.claude/settings.json` | Model, MCP-Server, Hook-Registrierung |
| `.claude/plugins/aegira-harness/` | Cowork-Plugin |
| `docs/` | Methodik-, Konzept-, Setup-, Troubleshooting-Doku |
| `memory/` | Lead-Plan-Persistenz |
| `examples/` | Beispiel-Eingabe und erwartete Ausgabe |

## Rollenverteilung Cowork ↔ Claude Code

| Aspekt | Cowork | Claude Code |
|---|---|---|
| **Rolle** | Concierge / Support | Runtime / Maschine |
| **Installation** | ✅ geführter Installer | manueller Fallback |
| **Token-Management** | ✅ sichere UI-Dialoge | `.env`/CLI |
| **MCP-Server verbinden** | ✅ UI-Wizard | `.claude/settings.json` |
| **Run starten** | leitet weiter an Claude Code | ✅ hier läuft `/run-harness` |
| **Subagenten** | — | ✅ |
| **Skills + Hooks** | — | ✅ |
| **Slash-Commands** | `/install-harness`, `/explain` | `/run-harness`, `/validate-plan`, … |
| **User-Hilfe** | ✅ interaktive Erklärungen | minimal |
| **Troubleshooting** | ✅ Log-Analyse, Fix-Vorschläge | Logs werden geschrieben |

Run-Modi (alle innerhalb von Claude Code):

| Modus | Wann | Wie |
|---|---|---|
| **Standard** | Interaktive Bedienung | `/run-harness` |
| **Dry-Run** | Trockenlauf für einen Meilenstein | `/run-harness --dry-run --only M02` |
| **Headless** | Unbeaufsichtigt mit Webhook-HITL | `/run-harness --headless` |

## Plan-Version

Siehe [`plan/_version.json`](plan/_version.json) für Schema-Version, Plan-Hash, Planausgabedatum und kontrollierende Instanz.

## Support

Issues und Fragen im Planner-Repo: [`github.com/exmachinai/agent_operating_model_planner`](https://github.com/exmachinai/agent_operating_model_planner).

## Lizenz

Apache-2.0 (siehe `LICENSE`). © 2026 exmachinAI GmbH.
