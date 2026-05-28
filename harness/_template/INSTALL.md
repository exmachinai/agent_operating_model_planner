# Installation Guide — Agent-Harness

> Der Harness **läuft in Claude Code** (das ist die Runtime — dort werden Subagenten gespawnt, Skills aktiviert, Hooks gefeuert).
> Die **Installation und der laufende User-Support gehen über Cowork** (dort wird geführt installiert, konfiguriert, beim Troubleshooting begleitet).
> Geschätzte Setup-Zeit: **5 Minuten** mit Cowork-geführter Installation.

---

## Inhalt

1. [Architektur-Bild](#architektur-bild)
2. [Voraussetzungen](#voraussetzungen)
3. [Installation via Cowork (empfohlen)](#installation-via-cowork-empfohlen)
4. [Manuelle Installation (nur Claude Code)](#manuelle-installation-nur-claude-code)
5. [Konfiguration (.env / settings.json)](#konfiguration-env--settingsjson)
6. [Integritäts-Check](#integritäts-check)
7. [Ersten Run starten](#ersten-run-starten)
8. [User-Support via Cowork](#user-support-via-cowork)
9. [Deinstallation](#deinstallation)
10. [Troubleshooting](#troubleshooting)

---

## Architektur-Bild

```
┌─────────────────────────┐      ┌─────────────────────────┐
│   Cowork                │      │   Claude Code           │
│   (Setup + Support)     │ ───▶ │   (Runtime)             │
│                         │      │                         │
│  • Geführte Installation│      │  • Subagenten           │
│  • Token-Konfiguration  │      │  • Skills               │
│  • MCP-Server-Verbinden │      │  • Slash-Commands       │
│  • In-App-Hilfe         │      │  • Hooks                │
│  • Troubleshooting      │      │  • Hier läuft /run-harness
└─────────────────────────┘      └─────────────────────────┘
```

**Kurz:** Cowork ist der Concierge. Claude Code ist die Maschine.

---

## Voraussetzungen

Pflicht:

| Komponente | Mindest-Version | Rolle | Wo herunterladen |
|---|---|---|---|
| **Cowork** | ≥ Research-Preview | Installer + Support | <https://claude.com/product/cowork> |
| **Claude Code** | ≥ 0.8 | **Runtime des Harness** | wird von Cowork mitinstalliert, sonst <https://claude.com/product/claude-code> |
| **Anthropic-Auth** | aktiv | LLM-Zugriff | Pro/Max/Team/Enterprise-Subscription oder API-Key |

Zusätzlich (optional):

| Komponente | Wofür |
|---|---|
| **Git** ≥ 2.30 | Versionierung der Plan-YAMLs |
| **unzip / Expand-Archive** | Entpacken der Harness-Zip |

Kein Node, kein Python, kein Docker. Bewusst.

---

## Installation via Cowork (empfohlen)

Cowork ist der Concierge — er installiert Claude Code, verbindet Tokens, mountet den Harness-Ordner, prüft Integrität und führt dich zum ersten Run.

### 1. Cowork installieren

Download über <https://claude.com/product/cowork>. Installer für macOS und Windows.

### 2. Harness-Setup-Plugin aktivieren

Beim ersten Cowork-Start: **Plugins → Install** → `aegira-harness-setup`. Sobald installiert, gibt es im Cowork-Chat den Slash-Command `/install-harness`.

### 3. Harness installieren

Im Cowork-Chat:

```
/install-harness ~/Downloads/<project_slug>.harness.zip
```

Cowork übernimmt automatisch:

1. **Integritäts-Check** der Zip (SHA-256-Prüfsummen).
2. **Entpacken** in `~/Documents/Claude/Projects/<project_slug>/`.
3. **Claude Code installieren**, falls noch nicht vorhanden.
4. **Authentifizierung** anstoßen (Browser-Login oder API-Key abfragen).
5. **MCP-Server** verbinden (z.B. `github-pat-mcp-server` — Token wird in der Cowork-UI sicher abgefragt und gespeichert).
6. **`.env`** im Harness-Ordner anlegen mit den eingegebenen Werten.
7. **ZGPM-Konsistenz-Check** des Plans.
8. **Hand-off** an Claude Code mit einem Link „Open in Claude Code".

Bei jedem Schritt sagt dir Cowork, was gerade passiert und was du tun musst. Du musst nichts auf der Kommandozeile machen.

### 4. Test-Run

Nach erfolgreicher Installation öffnet Cowork eine Claude-Code-Session im Harness-Ordner und führt automatisch `/run-harness --dry-run` aus. Wenn dieser Trockenlauf grün ist: alles ok.

---

## Manuelle Installation (nur Claude Code)

Für Power-User, die Cowork nicht nutzen möchten:

### M.1 Claude Code installieren

```bash
# macOS
brew install --cask claude-code

# Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows
winget install Anthropic.ClaudeCode
```

### M.2 Anthropic-Auth

```bash
claude auth login
# oder:
export ANTHROPIC_API_KEY=sk-ant-...
```

### M.3 Harness entpacken

```bash
# macOS / Linux
unzip ~/Downloads/<project_slug>.harness.zip -d ~/Projects/
cd ~/Projects/<project_slug>/

# Windows (PowerShell)
Expand-Archive -Path "$env:USERPROFILE\Downloads\<project_slug>.harness.zip" `
               -DestinationPath "$env:USERPROFILE\Projects\" -Force
cd "$env:USERPROFILE\Projects\<project_slug>\"
```

### M.4 `.env` einrichten

```bash
cp .env.example .env
# .env editieren — ANTHROPIC_API_KEY und optionale Tokens setzen
```

### M.5 Claude Code im Harness-Verzeichnis starten

```bash
claude
```

Beim Start:

- `CLAUDE.md` wird automatisch als System-Prompt geladen.
- `.claude/agents/` werden als Subagenten registriert.
- `.claude/skills/` werden als Skills entdeckt.
- `.claude/commands/` stellt die Slash-Commands bereit (z.B. `/run-harness`).
- `.claude/settings.json` definiert MCP-Server, Model-Defaults und Hooks.

Damit ist der Harness **bereit**. Kein zusätzlicher Build-Schritt.

---

## Konfiguration (.env / settings.json)

Zwei Konfig-Quellen, die sich ergänzen:

### `.claude/settings.json` (im Repo, committable)

Strukturelle Defaults — Model, Hooks, MCP-Server-Pointer.

```json
{
  "model": "claude-sonnet-4-6",
  "thinking_budget": "high",
  "mcp_servers": {
    "github-pat": {
      "command": "node",
      "args": ["../../mcp/github-pat-mcp-server/dist/index.js"]
    }
  },
  "hooks": {
    "pre-tool": [".claude/hooks/pre-tool/constitution-guard.json"],
    "post-tool": [".claude/hooks/post-tool/audit-log.json"],
    "stop": [".claude/hooks/stop/stop-on-red.json"]
  }
}
```

### `.env` (lokal, **niemals** committen)

Secrets — Token, API-Keys.

```ini
# Pflicht: einer der beiden
ANTHROPIC_API_KEY=sk-ant-...
# oder: Claude.ai-Login (kein Key nötig)

# Optional: Konnektoren
GITHUB_TOKEN=github_pat_...
GITHUB_DEFAULT_OWNER=exmachinai

# Optional: HITL-Benachrichtigungen
HITL_NOTIFY_SLACK_WEBHOOK=
HITL_NOTIFY_EMAIL=
```

`.env.example` zeigt alle akzeptierten Variablen.

---

## Integritäts-Check

Vor dem ersten Run prüfen, dass das Zip nicht manipuliert wurde:

```bash
# macOS / Linux
shasum -a 256 -c checksums.txt

# Windows
Get-FileHash -Algorithm SHA256 *  # vergleichen mit checksums.txt
```

Erwartet: `OK` für alle Dateien. Bei Mismatch: Zip neu herunterladen.

---

## Ersten Run starten

Der Harness läuft **in Claude Code**. Egal wie installiert.

```bash
# im Harness-Verzeichnis
claude
> /run-harness
```

Wenn du über Cowork installiert hast, öffnet Cowork Claude Code automatisch im richtigen Ordner und sendet `/run-harness` direkt.

### Was passiert

1. Pre-Tool-Hook validiert `.env` und `plan/` (ZGPM-Konsistenz-Regeln).
2. Reviewer-Agent läuft initialen Konsistenz-Check.
3. Erster offener Meilenstein wird betreten.
4. PMO-Agent delegiert Sub-Tasks an spezialisierte Subagenten.
5. Bei HITL-Punkten erscheint die Approval-Frage direkt im Chat.

Zum Pausieren einfach Tab schließen oder `Ctrl+C` — State persistiert in `.harness/<run-id>/state.json` und wird beim nächsten `/run-harness` aufgenommen.

---

## User-Support via Cowork

Cowork ist nicht nur Installer, sondern auch dein **laufender Support-Channel**:

| Du brauchst … | Was Cowork bietet |
|---|---|
| Hilfe beim Setup eines neuen Tokens | Geführte Dialoge mit sicherem Token-Eingabefeld |
| Erklärung zu einem Hook / Skill / Agent | Slash-Command `/explain` (im Cowork-Chat) — erklärt jedes Element des Harness in einfachen Worten |
| Troubleshooting bei einem Fehler | Cowork analysiert die Logs unter `.harness/<run-id>/logs/` und schlägt Fixes vor |
| Neues MCP-Connector verbinden | UI-geführter Wizard mit Token-Validierung |
| Mehrsprachige Hilfe | Cowork antwortet in der Sprache deines Cowork-Settings |
| Cowork-First-Run-Tutorial | Onboarding-Walkthrough beim ersten Start |

Tipp: Du kannst Cowork und Claude Code **parallel** offen halten. Cowork hilft, Claude Code arbeitet.

---

## Deinstallation

```bash
# macOS / Linux
rm -rf ~/Projects/<project_slug>/

# Windows
Remove-Item -Recurse -Force "$env:USERPROFILE\Projects\<project_slug>\"
```

Claude Code / Cowork bleiben unangetastet. Etwaige Cloud-Logs (Anthropic) bleiben beim Anbieter gemäß deren Aufbewahrungsregeln.

---

## Troubleshooting

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| `claude` Kommando nicht gefunden | Claude Code nicht installiert oder nicht im PATH | `which claude` oder Installation wiederholen |
| Slash-Commands erscheinen nicht | Harness-Ordner nicht aktiv | im Harness-Verzeichnis `claude` starten / in Cowork richtigen Workspace wählen |
| MCP-Server „failed to start" | Pfad in `.claude/settings.json` falsch | absoluten Pfad eintragen, dann `claude` neu starten |
| Auth-Fehler `401` | API-Key fehlt oder abgelaufen | `claude auth login` / `.env` updaten |
| HITL-Approval-Frage erscheint nicht | falscher Approval-Mode | siehe USERGUIDE.md → „HITL-Workflows" |
| ZGPM-Konsistenz-Fehler beim Start | Plan-YAML manuell editiert | `/validate-plan` aufrufen, Fehler lesen, fixen |
| Subagent „bleibt hängen" | Token-Budget oder Tool-Fail | Logs prüfen unter `.harness/<run-id>/logs/` |
| Mismatch in `checksums.txt` | Zip korrupt | Original-Zip neu herunterladen |
| Plugin in Cowork lädt nicht | falsche Plugin-Manifest-Version | Plugin-Version gegen Cowork-Version checken, ggf. updaten |

Weiter ungelöst? Siehe `docs/05_troubleshooting.md` oder Issue im Repo `github.com/exmachinai/agent_operating_model_planner`.

---

## Versions-Info

Schema-Version siehe `plan/_version.json`. Diese Anleitung bezieht sich auf Harness-Schema **1.x** (Claude-Code-/Cowork-native).
