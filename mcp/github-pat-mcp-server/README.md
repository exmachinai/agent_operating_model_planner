# github-pat-mcp-server

> Lokaler MCP-Server für GitHub via **Fine-Grained Personal Access Token**. Funktioniert ohne OAuth — Ersatz für den `plugin:engineering:github`-Connector, wenn dessen OAuth-Flow im Client (Cowork, Claude Code) nicht funktioniert.

## Warum existiert das?

Der offizielle GitHub-Connector verlangt **Dynamic Client Registration**, was viele MCP-Clients (u.a. Cowork) heute noch nicht unterstützen. Dieser Server umgeht das mit einem klassischen PAT-Flow: Token ins `.env`, fertig.

## Highlights

- **19 Tools** für Repos, Contents, Branches, Issues, PRs, Milestones, Releases.
- **Constitution-Safety-Guard** — Writes auf geschützte Pfade (default `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**`) sind standardmäßig blockiert.
- **Octokit-basiert** — saubere, getestete GitHub-API-Schicht.
- **Strikte TypeScript-Typen + Zod-Validierung** — keine `any`, alle Inputs validiert.
- **JSON + Markdown** Antwortformate je Tool.
- **Pagination** überall mit `has_more` / `next_offset`.
- **Actionable Error Messages** mit Hinweis auf nächsten Schritt.

## Installation

```bash
cd mcp/github-pat-mcp-server
cp .env.example .env
# .env editieren — GITHUB_TOKEN eintragen
npm install
npm run build
```

## Verwendung mit Claude Code

In `~/.claude.json` oder `claude_desktop_config.json` hinzufügen:

```json
{
  "mcpServers": {
    "github-pat": {
      "command": "node",
      "args": [
        "/absolute/path/to/agent_operating_model_planner/mcp/github-pat-mcp-server/dist/index.js"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx",
        "GITHUB_DEFAULT_OWNER": "exmachinai"
      }
    }
  }
}
```

## Verwendung mit Cowork

Als Plugin packen (siehe `docs/cowork-plugin.md`, kommt) oder lokal als stdio-Server.

## Wichtig — Konflikt mit offiziellem Connector

Tool-Namen folgen der Konvention `github_*`. Der offizielle `plugin:engineering:github`-Server verwendet dieselbe Namensgebung. **Beide Server dürfen nicht gleichzeitig aktiv sein**, sonst kollidieren die Tool-Namen. Empfehlung: Den offiziellen Connector deaktivieren, solange dieser Server aktiv ist.

## Tool-Inventar

| Tool | Kategorie | Zweck | r/w |
|---|---|---|---|
| `github_whoami` | Auth | Verifiziert Token, listet effektive Scopes | r |
| `github_list_repos` | Repos | Listet Repos (User oder Org) | r |
| `github_get_repo` | Repos | Metadaten eines Repos | r |
| `github_create_repo` | Repos | Neues Repo anlegen | w |
| `github_search_code` | Search | Code-Suche | r |
| `github_read_file` | Contents | Dateiinhalt an Ref | r |
| `github_write_file` | Contents | Datei anlegen oder aktualisieren | w (guarded) |
| `github_list_directory` | Contents | Verzeichnisinhalt | r |
| `github_list_branches` | Branches | Branch-Liste | r |
| `github_create_branch` | Branches | Branch von Base-Ref | w |
| `github_list_issues` | Issues | Issue-Liste mit Filtern | r |
| `github_get_issue` | Issues | Einzelnes Issue | r |
| `github_create_issue` | Issues | Neues Issue | w |
| `github_update_issue` | Issues | State, Labels, Assignees, Kommentar | w (guarded) |
| `github_list_pull_requests` | PRs | PR-Liste mit Filtern | r |
| `github_create_pull_request` | PRs | Neuen PR öffnen | w |
| `github_list_milestones` | Milestones | Milestone-Liste | r |
| `github_create_milestone` | Milestones | Neuen Milestone anlegen | w |
| `github_create_release` | Releases | Release inkl. Binär-Asset-Upload (Harness-Zip!) | w |

## Constitution-Safety-Guard

Jeder Write-Call (`write_file`, `update_issue` mit State/Title-Änderung, `create_pull_request` der geschützte Pfade berührt) prüft den Zielpfad gegen `GITHUB_PROTECTED_PATHS`. Bei Treffer wird der Call **abgelehnt**, außer der Caller übergibt explizit:

```json
{
  "acknowledge_protected_path": true,
  "protected_path_reason": "Knowledge-Manager-Rolle, freigegeben durch HITL-PM in Ticket #42"
}
```

Standard-Schutz: `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**`. Anpassbar via `GITHUB_PROTECTED_PATHS`.

## Rate-Limits

Fine-Grained-PAT: 5.000 Requests/Stunde (authenticated). Search-Endpoints separat: 30 Requests/Minute. Der Server respektiert die Limits und gibt bei 429 eine actionable Fehlermeldung mit Reset-Zeitpunkt zurück.

## Entwicklung

```bash
npm run dev          # Watch-Mode
npm run typecheck    # TypeScript-Check ohne Build
npm run inspect      # MCP-Inspector lokal
npm run build        # Production-Build → dist/
```

## Tests

Tests laufen über den MCP Inspector (interaktiv) und automatisierte Smoke-Tests:

```bash
npm run build
node dist/index.js < test/fixtures/list_tools.jsonl
```

(Smoke-Test-Fixtures folgen in Phase 4.)

## Lizenz

Apache-2.0, Copyright 2026 exmachinAI GmbH.
