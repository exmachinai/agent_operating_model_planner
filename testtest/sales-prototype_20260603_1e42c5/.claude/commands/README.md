# `.claude/commands/` — abgelöst (v0.9)

Die Harness-Befehle (`/run-harness`, `/show-plan`, …) sind jetzt **Skills** unter `.claude/skills/<name>/SKILL.md` (Slash-only via `disable-model-invocation`).
Claude Code lädt Skills bevorzugt; bei Namenskollision gewinnt der Skill. Dieses Verzeichnis bleibt nur als Migrationshinweis bestehen.
