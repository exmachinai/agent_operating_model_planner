# Contributing

Danke fürs Mitwirken am **AEGIRA Agent Operating Model Planner**. Dieses Repo ist Teil der AEGIRA AI Trust Platform und folgt strikt der AEGIRA-Constitution (siehe `CLAUDE.md`).

## Wer darf was

| Rolle | Darf | Darf nicht |
|---|---|---|
| **Knowledge-Manager** | Constitution, Semantic-Core, Strategy, Journey-Graphs ändern (Zone 2). | — |
| **Maintainer** | PRs mergen, Releases schneiden, Issues triagieren. | Constitution ändern. |
| **Contributor** | PRs gegen Feature-Branches, Issues anlegen, Docs verbessern. | Direkt nach `main` pushen, geschützte Pfade ändern. |
| **Agent (Claude/Subagent)** | Code generieren, Tests schreiben, Docs entwerfen. | Eigenständig Releases schneiden, Tokens lesen, Constitution-Pfade beschreiben. |

## Workflow

1. **Issue zuerst.** Jede nicht-triviale Änderung beginnt mit einem Issue. Für Methodik-Änderungen (ZGPM-Mapping, McK-Treue) Label `methodology`.
2. **Branch.** `feature/<kurz>`, `fix/<kurz>`, `docs/<kurz>`. Kein direkter `main`-Commit.
3. **Plan vor Code.** Bei größeren Änderungen erst `docs/` aktualisieren, PR-Beschreibung referenziert den Plan-Diff.
4. **PR-Titel im Imperativ** auf Englisch: `add github_create_release tool`, nicht `Added create release`.
5. **Tests / Build.** Lokal grün, bevor du PR aufmachst.
6. **Review.** Mindestens ein Maintainer-Review. Bei Constitution-relevanten Änderungen zusätzlich Knowledge-Manager-Review.

## Commit-Konvention

Conventional Commits, kurz gehalten:

```
feat(mcp): add github_create_release tool
fix(harness): respect protected paths on write
docs(zgpm): clarify Ergebnispfad mapping
chore: bump octokit to 21.0.2
```

## Code-Style

- **TypeScript**: strict mode, kein `any`, Zod für externe Daten, Octokit als GitHub-Client.
- **Python**: PEP 8, Pydantic für externe Daten, Type-Hints überall.
- **Markdown**: kurze Sätze, sparsam mit Bullet-Listen, Tabellen für Vergleiche.
- **Sprache**: Docs primär Deutsch (Constitution-Sprache), Code-Identifier Englisch.

## Tests

- MCP-Server: `npm run build` muss grün sein. Smoke-Test via MCP Inspector vor jedem Release.
- Harness-Templates: müssen sich entpacken lassen und ohne Cloud-Account lokal laufen.

## Sicherheit

- **Niemals Tokens commiten.** `.env` ist gitignored, `.env.example` zeigt nur Schlüssel.
- **Constitution-Safety-Guard:** Writes auf `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**` sind standardmäßig blockiert. Explizit zu setzendes Acknowledgement-Flag plus Knowledge-Manager-Review erforderlich.
- **Issues mit Security-Bezug** als Label `security`, **nicht** öffentlich diskutieren, sondern an `security@exmachinai` (sobald angelegt).

## Lizenz

Mit deinem Beitrag stimmst du der Veröffentlichung unter **Apache-2.0** (siehe `LICENSE`) zu.

## Fragen

Issues mit Label `question`, oder direkt im Cowork-Plugin via Knowledge-Manager-Channel.
