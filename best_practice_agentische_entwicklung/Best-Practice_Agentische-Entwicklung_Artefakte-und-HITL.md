# Agentische Entwicklung – Artefakte und Human-in-the-Loop

**Generischer Best-Practice-Leitfaden für Claude Code und Claude Cowork**
Stand: Juni 2026 · Versionsabhängige Angaben gegen die offizielle Dokumentation der eingesetzten Version prüfen.

---

## Inhalt

1. [Begriffsklärung und Korrekturen](#1-begriffsklärung-und-korrekturen)
2. [Architekturprinzip: Workflows vs. Agenten](#2-architekturprinzip-workflows-vs-agenten)
3. [Artefakt-Landkarte (14 Schichten)](#3-artefakt-landkarte-14-schichten)
4. [Claude Code – Konfiguration und Artefakte](#4-claude-code--konfiguration-und-artefakte)
5. [Claude Cowork – Wissensarbeit-Agent](#5-claude-cowork--wissensarbeit-agent)
6. [Human-in-the-Loop und Governance](#6-human-in-the-loop-und-governance)
7. [Reifegradmodell](#7-reifegradmodell)
8. [Empfehlungen und Schwellen](#8-empfehlungen-und-schwellen)
9. [Einschränkungen](#9-einschränkungen)
10. [Referenzen](#10-referenzen)

---

## 1. Begriffsklärung und Korrekturen

Vier Korrekturen, die jede agentische Dokumentation zuerst klären sollte:

| Häufige Annahme | Korrektur |
|---|---|
| „Cloud Code" | Das Produkt heißt **Claude Code** [1]. „Cloud Code" ist kein Anthropic-Produkt. Eine cloudbasierte Variante existiert als „Claude Code on the web", das Produkt selbst bleibt „Claude Code". |
| AGENTS.md sei die native Memory-Datei | Die native Kontext-/Speicherdatei ist **CLAUDE.md**, automatisch zu Sessionbeginn geladen [4]. **AGENTS.md ist eine werkzeugübergreifende Community-Konvention** (Codex, Cursor, Gemini CLI u. a.) und wird von Claude Code **nicht nativ** gelesen [8][9]. Workaround: per `@import` aus CLAUDE.md referenzieren oder symlinken. |
| `.claude/commands/` als primäres Workflow-Format | Custom Commands wurden **in Skills überführt** [8]. `.claude/commands/deploy.md` und `.claude/skills/deploy/SKILL.md` erzeugen beide `/deploy`; bei Kollision **gewinnt der Skill**. Skills sind das empfohlene Format. |
| CLAUDE.local.md werde automatisch verwaltet | CLAUDE.local.md ist **manuell** anzulegen und gehört selbst in `.gitignore`; sie wird neben CLAUDE.md geladen [2]. |

---

## 2. Architekturprinzip: Workflows vs. Agenten

Anthropics Leitlinie „Building effective agents" unterscheidet zwei Systemtypen [10]:

- **Workflows** orchestrieren LLMs und Tools über **vordefinierte Code-Pfade**.
- **Agenten** lassen das LLM **dynamisch eigene Prozesse und Tool-Nutzung steuern** und behalten die Kontrolle darüber, wie eine Aufgabe gelöst wird.

Der gemeinsame Baustein ist das „augmented LLM" (Retrieval, Tools, Memory). Fünf bewährte Workflow-Muster [10]: **Prompt Chaining** (sequenzielle Schritte mit programmatischen „gate"-Checks), **Routing** (Input klassifizieren, an spezialisierte Folgeaufgabe leiten), **Parallelization** (Sectioning und Voting), **Orchestrator-Workers** (zentrales LLM zerlegt dynamisch und synthetisiert) und **Evaluator-Optimizer** (Generieren/Bewerten in Schleife).

Drei Kernprinzipien [10]:
1. Einfachheit im Design bewahren.
2. Transparenz priorisieren – Planungsschritte des Agenten explizit zeigen.
3. Die Agent-Computer-Schnittstelle (ACI) sorgfältig gestalten (gründliche Tool-Dokumentation und -Tests).

Agenten lohnen sich „für offene Probleme, bei denen die nötige Schrittzahl schwer vorhersagbar ist" – Voraussetzung ist ein gewisses Vertrauen in die Entscheidungsfindung des Modells, abgesichert durch **Checkpoints für menschliches Feedback**, **Stopping-Conditions** (z. B. maximale Iterationen) und **umfangreiche Tests in Sandbox-Umgebungen mit Guardrails** [10].

---

## 3. Artefakt-Landkarte (14 Schichten)

Artefakte mit korrektem Pfad, Commit-Status und Ownership. `✓ git` = committen; `gitignored` = nicht committen.

| # | Schicht | Ort | Owner | Commit |
|---|---|---|---|---|
| 1 | Org-Policy / Managed | `managed-settings.json`, Managed-CLAUDE.md, `managed-mcp.json` | IT/Admin | systemweit, nicht überschreibbar |
| 2 | Projekt-Memory | `./CLAUDE.md` | Team | ✓ git |
| 3 | Pfad-/Themen-Regeln | `.claude/rules/*.md` | Team | ✓ git |
| 4 | Persönliche Projekt-Notizen | `./CLAUDE.local.md` | Individuum | **gitignored** |
| 5 | Projekt-Settings | `.claude/settings.json` | Team | ✓ git |
| 6 | Persönliche Overrides | `.claude/settings.local.json` | Individuum | **auto-gitignored** |
| 7 | Skills | `.claude/skills/<name>/SKILL.md` (+ Supporting-Files) | Team | ✓ git |
| 8 | Subagents | `.claude/agents/*.md` | Team | ✓ git |
| 9 | Hooks | Konfig in `settings.json`; Skripte in `.claude/hooks/` | Team | ✓ git |
| 10 | MCP-Konfig | `.mcp.json` (Credentials per env) | Team | ✓ git – **Credentials nie** |
| 11 | Plan-Artefakte | `~/.claude/plans/` bzw. `plansDirectory` | geteilt/lokal | optional |
| 12 | Auto-/Agent-Memory | `~/.claude/projects/<p>/memory/`, `.claude/agent-memory/` | lokal/Team | teils committbar |
| 13 | Session-Transcripts | `~/.claude/projects/<p>/<session>.jsonl` | lokal | **unverschlüsselt** |
| 14 | Output-Deliverables | Code-Diffs/PRs (Code); Excel/PPT/Word/Reports (Cowork) | – | Endprodukt |

**Commit-Disziplin:** Committen: `CLAUDE.md`, `.claude/settings.json`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.mcp.json`. **Nicht committen:** `settings.local.json` (auto-gitignored), `CLAUDE.local.md`, alles mit Credentials. Transcripts unter `~/.claude/projects/...` sind **nicht verschlüsselt** – liest ein Tool eine `.env`, landet der Wert im Transcript. Gegenmaßnahmen: `cleanupPeriodDays` senken (Default 30), `CLAUDE_CODE_SKIP_PROMPT_HISTORY` setzen, Deny-Regeln für Credential-Dateien [6].

---

## 4. Claude Code – Konfiguration und Artefakte

### Speicherhierarchie (Memory)

Vier additiv konkatenierte Ebenen, geladen via Directory-Walk vom CWD zur Repo-Wurzel [4][2]:

1. **Managed/Policy** – organisationsweit, nicht überschreibbar, nicht ausschließbar.
2. **Project** – `./CLAUDE.md`, committed.
3. **User** – `~/.claude/CLAUDE.md`, persönlich, projektübergreifend.
4. **Local** – `./CLAUDE.local.md`, manuell, gitignored.

### Empfohlene Verzeichnisstruktur

```text
projekt/
├── CLAUDE.md                  # Projekt-Memory, committed
├── CLAUDE.local.md            # persönlich, gitignored, manuell anlegen
├── .mcp.json                  # team-geteilte MCP-Server, committed
└── .claude/
    ├── settings.json          # Permissions, Hooks, env, Modell – committed
    ├── settings.local.json    # persönliche Overrides – auto-gitignored
    ├── rules/*.md             # pfad-/themen-skopierte Instruktionen
    ├── skills/<name>/SKILL.md # Skills (empfohlen)
    ├── commands/*.md          # Legacy-Commands (funktionieren weiter)
    ├── agents/*.md            # Subagent-Definitionen
    ├── hooks/                 # Hook-Skripte (Pfad-Konvention)
    └── output-styles/*.md     # System-Prompt-Anpassungen
~/.claude/                     # globaler, projektübergreifender Scope
```

### CLAUDE.md richtig schreiben

CLAUDE.md ist kein Dokumentationsspeicher, sondern ein **Verhaltensvertrag** [3]. Pro Zeile fragen: „Würde das Entfernen Claude einen Fehler machen lassen?" – wenn nein, streichen; überladene Dateien führen dazu, dass Anweisungen ignoriert werden [2][3]. **Aufnehmen:** nicht erratbare Bash-Befehle, Code-Style-Abweichungen, Test-Instruktionen, Repo-Etikette, projektspezifische Architektur, Umgebungs-Quirks. **Auslagern:** Domänenwissen, das nur manchmal gilt, in **Skills** (laden on demand). `@path`-Imports bis Tiefe 5; `/init` erstellt eine Start-Datei, `/memory` editiert sie.

### Permissions (settings.json)

Drei Listen – `allow`, `ask`, `deny`. Auswertungsreihenfolge: **deny → ask → allow** (deny gewinnt immer); Managed Settings haben Vorrang vor allem [6]. `defaultMode` setzt den Permission-Modus.

### Hooks

Konfiguriert in `settings.json` (oder Agent-/Skill-Frontmatter); Skripte typischerweise in `.claude/hooks/` [6]. Hooks sind **deterministisch** und damit das eigentliche Durchsetzungsinstrument (CLAUDE.md ist nur advisory). Handler-Typen: `command`, `http`, `prompt`, `agent`, `mcp_tool`. Exit-Codes [14]: **0** = keine Einwände, **2** = blockieren (stderr wird Claude als Feedback gegeben), andere = nicht-blockierender Fehler. Bei `UserPromptSubmit` und `SessionStart` wird stdout in den Kontext injiziert.

Relevante Events (kanonische Liste: Hooks-Referenz [14]): `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `SessionStart` (startup/resume/clear/compact), `SessionEnd`, `PreCompact`/`PostCompact`, `Notification`, `WorktreeCreate`/`WorktreeRemove`.

**HITL-relevant:** Ein `PreToolUse`-Hook mit `permissionDecision: "deny"` blockiert **sogar im bypassPermissions-Modus** und feuert auch für Subagent-Aktionen (rekursive Durchsetzung) [14]. Schwere Checks ans Session-Ende oder in CI verlagern (synchrone Ausführung).

### Skills

`SKILL.md` = YAML-Frontmatter + Markdown, empfohlenes Erweiterungsformat [11]. Model-invoziert (automatisch bei passender `description`) oder per `/name`. Wichtige Frontmatter-Felder: `name`, `description`, `argument-hint`, `disable-model-invocation`, `allowed-tools`/`disallowed-tools`, `model`, `effort`, `context: fork` (im Subagent ausführen), `paths` (Glob-Aktivierung). Präzedenz: Enterprise > Personal > Project; Plugin-Skills sind namespaced (`plugin:skill`). SKILL.md unter ~500 Zeilen halten, Details in Supporting-Files; der Body bleibt nach Invocation im Kontext (Token-Kosten) [11].

### Subagents

`.claude/agents/*.md`, laufen in **isolierten Kontextfenstern** mit eigenem System-Prompt, Toolset, Modell und Permissions [5]. Pflichtfelder nur `name` und `description`; weitere: `tools` (weggelassen ⇒ erbt alle), `model`, `permissionMode`, `isolation: worktree`. Built-in: **Explore** (read-only, schnell/günstig), **Plan**, **general-purpose**. Best Practice: minimale Tool-Sets je Rolle (Reviewer: nur Read/Grep/Glob); `CLAUDE_CODE_SUBAGENT_MODEL` als Kostendeckel.

### MCP

Projekt-Config in `.mcp.json` (committbar) [13]. Transports: `stdio`, `http` (Streamable HTTP, aktueller Standard, OAuth-fähig), `ws`; SSE deprecated. Scopes: `local`, `user`, `project`. Auth: OAuth 2.1 mit PKCE (`/mcp`). **Credentials per env referenzieren** (`${DATABASE_URL}`) statt hardcoden, damit `.mcp.json` committbar bleibt. Enterprise: `managed-mcp.json` mit Allow-/Denylist.

### Permission-Modi

`default` (nur Lesen ohne Nachfrage), `acceptEdits`, `plan` (read-only Exploration), `auto` (separates Klassifikatormodell prüft vor Ausführung; blockiert Scope-Eskalation und hostile-content-getriebene Aktionen), `dontAsk` (CI), `bypassPermissions` (alle Checks aus – **nur in isolierten Containern/VMs**) [7]. „Protected Paths" (`.git`, `.mcp.json`, Shell-RC u. a.) werden außer im Bypass nie auto-genehmigt; der Auto-Modus blockiert standardmäßig u. a. `curl | bash`, Production-Deploys, Massen-Löschungen und Push auf `main` [7].

### Leitworkflows

- **Explore → Plan → Implement → Commit** (kanonisch) – Direkt-Loskodieren produziert „code that solves the wrong problem" [10].
- **Verifikation als höchster Hebel:** „Give Claude a way to verify its work" – via In-Prompt-Iteration, Stop-Hook-Gate oder Verifikations-Subagent [3].
- **Kontext-Management:** `/clear` zwischen unzusammenhängenden Aufgaben, `/compact <Fokus>`, Checkpoints (`/rewind`).
- **Adversariale Review:** Diff in frischem Kontext von einem Subagent prüfen lassen (nur korrektheitsrelevante Lücken melden, sonst Over-Engineering) [3].
- **Sicherheit:** Auto-Modus, Allowlists, `/sandbox`, Devcontainer (Non-Root); Bypass nur in internetlosen Containern.
- **Headless/CI:** `claude -p "prompt" --output-format json --allowedTools ... --permission-mode dontAsk`.

---

## 5. Claude Cowork – Wissensarbeit-Agent

**Was es ist:** Cowork führt mehrstufige Wissensarbeit im Auftrag des Nutzers aus (Recherche-Synthese, Dokumentenerstellung, Dateiverwaltung) und ist „not a chat assistant" [17]. Es bringt die agentische Architektur von Claude Code ohne Terminal in die **Claude-Desktop-App** (macOS und Windows) für nicht-technische Wissensarbeit [16]. Angekündigt am **12. Januar 2026 als Research Preview** (zunächst Claude Max, macOS), inzwischen breit verfügbar auf den bezahlten Plänen [16][19].

**Artefakte/Outputs:** Excel mit funktionierenden Formeln (mehrere Tabs, bedingte Formatierung), PowerPoint, formatierte Word-Dokumente/PDFs, Reports aus unstrukturierten Inputs, organisierte/umbenannte/deduplizierte Dateien, Datenanalysen [16][17].

**Architektur – zwei Ausführungsumgebungen pro Gerät** [18]:
1. **Agent-Loop nativ auf dem Host** – Conversation, Datei-Lese/Schreibzugriffe in verbundenen Ordnern, Web-Fetches, lokale Plugin-MCP-Server; gegated durch Application-Layer-Permission (verbundene Ordner + Netzwerk-Egress).
2. **Code-Ausführung in isolierter Linux-VM** (Apple Virtualization.framework / Hyper-V) mit eigenem Egress-Filtering, Syscall-Restriktionen und Per-Session-User-Isolation.

„If you don't give it access to a folder, Claude literally cannot see that folder" – eine Virtualisierungsgrenze, keine Prompt-Anweisung [19].

**Steuerung:** Global Instructions, Folder Instructions, Projects (mit Memory – nur innerhalb von Projects, nicht über Standalone-Sessions), geplante Tasks via `/schedule` (laufen nur bei waches Gerät + offene App), mobiler Zugriff (Tasks vom Handy anstoßen, Ausführung auf dem Desktop) [16].

**Berechtigungen und Sicherheit:** Lesen/Schreiben/Löschen nur in **freigegebenen Ordnern**; dedizierten Arbeitsordner statt breiten Zugriff empfehlen [20]. **Löschschutz:** explizite „Allow"-Bestätigung vor jeder permanenten Löschung [20]. **Modi:** „Ask before acting" (empfohlen bei neuen Tools/unbekannten Dateien) vs. „Act without asking" (schneller, höheres Prompt-Injection-Risiko – nur bei aktiver Aufsicht) [20]. **„You remain responsible for all actions taken by Claude on your behalf"** [21].

**Teams/Enterprise:** Org-weiter Toggle; Enterprise mit Role-Based Access Controls. **Wichtige Lücke:** Cowork-Aktivität ist (Stand Doku) **nicht in Audit-Logs oder der Compliance API erfasst** – verfügbar sind **Analytics API und OpenTelemetry (OTel)** zum Streamen an SIEM/Observability [22].

---

## 6. Human-in-the-Loop und Governance

**Fünf Prinzipien (Anthropic-Rahmenwerk):** menschliche Kontrolle, Transparenz, Wertealignment, Datenschutz, Sicherheit [23]. Zentrale Spannung: „to be useful, they need to work autonomously, but to keep them secure, humans still need to retain meaningful control over how they work" [23].

**HITL-Gates (generisch, an die fünf Prinzipien gekoppelt):**
1. **Zieldefinition** – Mensch setzt Ziel und Erfolgskriterium.
2. **Architektur-/Plan-Freigabe** – Plan-Modus, read-only Exploration vor Ausführung.
3. **Risiko-/Scope-Akzeptanz** – harte Gates an irreversiblen Punkten (Stop-Hook, `deny`).
4. **Produktions-/Veröffentlichungsfreigabe** – Approval vor system-/code-ändernden oder publizierenden Aktionen.

**Aufsicht ist mehr als ein Approval-Klick** [25]: Gut designte Agenten fragen häufiger nach Klärung, als Menschen unterbrechen – auf den komplexesten Zielen fragte Claude Code in **16,4 %** der Turns nach, Menschen unterbrachen nur in **7,1 %** [25]. Software eignet sich überdurchschnittlich für supervisorische Aufsicht (Outputs sind testbar); Software-Engineering macht **49,7 %** aller Tool-Calls aus [25].

**Reversibilität als Leitkriterium:** In der Praxis stammen **~80 %** der Tool-Calls von Agenten mit mindestens einem Safeguard (Anthropic nennt dies eine Obergrenze), **~73 %** haben „a human in the loop in some way", und **nur ~0,8 %** der Aktionen sind irreversibel (z. B. eine Kunden-E-Mail senden) [26]. Mit Erfahrung steigt der Anteil voll auto-genehmigter Sessions von **~20 %** auf **über 40 %** – bei zugleich steigender Interrupt-Rate (aktives Monitoring statt Aufgabe der Aufsicht) [26].

**Audit/Logging:** Claude Code – Plan-Modus, Checkpoints/`/rewind` (File-Snapshots, kein git-Ersatz), Stop-Hooks, `permissionDecision: "deny"`. Cowork – Löschschutz, Steering, OTel-Monitoring (Compliance API erfasst Cowork noch nicht) [22].

---

## 7. Reifegradmodell

Gekoppelt an Permission-Modi (Claude Code) und Cowork-Modi:

- **Stufe 1 – Assistiert / Read-only:** `default`/`plan`-Modus, manuelle Approvals, CLAUDE.md + `/init`, kein Auto-Accept. HITL: jede Aktion geprüft.
- **Stufe 2 – Strukturiert:** committete `.claude/`-Konfig (settings, rules, skills, agents), erste Hooks (Format/Secret-Block), MCP per env, Explore→Plan→Code→Commit etabliert. HITL: Verifikation + Review-Subagent.
- **Stufe 3 – Teilautonom / gegated:** `acceptEdits`/`auto`-Modus mit deterministischen Stop-Hooks, adversariale Review, Devcontainer/Sandbox, Cowork mit „Ask before acting" + Folder-Zonen. HITL: harte Gates an irreversiblen Punkten.
- **Stufe 4 – Skaliert / orchestriert:** parallele Sessions/Agent-Teams/Worktrees, Headless-CI (`-p`), geplante Cowork-Tasks, OTel-/Analytics-Monitoring, Org-Managed-Policies, Plugin-Marketplaces. HITL: Spot-Checks plus Audit/Telemetrie.

**Grundsatz:** Autonomie an **Reversibilität** der Aktion festmachen, nicht an der Pipeline-Mechanik. „Auto-Merge" ist eine Konsequenz ausreichender Verifikation, kein Stufenziel an sich.

---

## 8. Empfehlungen und Schwellen

**Sofort (Korrekturen):**
1. „Cloud Code" → „Claude Code"; CLAUDE.md als native Memory-Datei, AGENTS.md als optionale, per `@import` einbindbare Cross-Tool-Konvention.
2. `.claude/commands/` als Legacy markieren; Skills als empfohlenes Format dokumentieren.
3. Commit-/Gitignore-Matrix einführen; Credentials nie committen, Transcripts als unverschlüsselt kennzeichnen.

**Kurzfristig:**
4. Explore→Plan→Code→Commit und „Verifikation als höchster Hebel" verankern; Stop-Hook-Gate + Review-Subagent als HITL-Standard für irreversible Schritte.
5. Permission-Modi-Tabelle inkl. Protected Paths; Bypass nur in Containern.
6. Cowork als gleichwertiges Kapitel: VM-Isolation, Ordner-Zonen, Löschschutz, „Ask/Act"-Modi, geplante Tasks, Projects/Memory, OTel, Verantwortungsklausel.

**Mittelfristig:**
7. HITL-Gates auf die fünf Prinzipien mappen; Reifegrad an Permission-/Cowork-Modi koppeln.
8. Audit/Telemetrie operationalisieren: Claude Code via Hooks + Analytics API; Cowork via OTel (Compliance-Lücke dokumentieren).

**Schwellen, die Empfehlungen kippen:**
- Stufe 2→3 erst, wenn deterministische Verifikation (Tests/Build/Lint als Stop-Hook) steht.
- `auto`/`acceptEdits` nur mit Devcontainer/Sandbox bei nicht-trivialen Repos.
- `bypassPermissions` ausschließlich in isolierten, internetlosen Containern.
- Cowork-„Act without asking" nur bei aktiver Aufsicht und vertrauten Quellen.

---

## 9. Einschränkungen

- **Versionsabhängigkeit:** Claude Code entwickelt sich schnell (z. B. Auto-Modus ab v2.1.83). Exakte Feldnamen/Events gegen die Doku der jeweiligen Version prüfen.
- **Hook-Event-Inventar:** Die offizielle Referenz [14] ist kanonisch; einzelne Detail-Events aus Drittquellen mit „27+/32+"-Angaben variieren.
- **Cowork-Status/-Defaults:** Detailangaben (z. B. Modell-Default, Plan-Verfügbarkeit) stammen teils aus Drittquellen und können sich ändern.
- **Cowork-Auditierbarkeit:** Nicht in Compliance API/Audit-Logs erfasst – nur Analytics API und OTel. Reale Governance-Lücke für regulierte Umgebungen [22].
- **Prompt-Injection** bleibt laut Anthropic ein nicht vollständig gelöstes Restrisiko in beiden Produkten, insbesondere bei Cowork mit Web-/Browser-/Computer-Use-Zugriff [20].

---

## 10. Referenzen

1. Claude Code – Übersicht. https://code.claude.com/docs/en/overview
2. How Claude remembers your project (Memory). https://code.claude.com/docs/en/memory
3. Claude Code – Best Practices. https://code.claude.com/docs/en/best-practices
4. Claude Code – Memory/Kontextdateien. https://code.claude.com/docs/en/memory
5. Create custom subagents – Claude Code Docs. https://code.claude.com/docs/en/sub-agents
6. Claude Code – Settings/Permissions. https://code.claude.com/docs/en/best-practices
7. Claude Code – Permission Modes. https://code.claude.com/docs/en/permission-modes
8. AGENTS.md vs CLAUDE.md Explained – Build This Now. https://www.buildthisnow.com/blog/guide/mechanics/agents-md-vs-claude-md
9. Feature request: AGENTS.md als nativer Kontext – GitHub Issue #34235 (anthropics/claude-code). https://github.com/anthropics/claude-code/issues/34235
10. Building Effective AI Agents – Anthropic. https://www.anthropic.com/research/building-effective-agents
11. Claude Code – Skills. https://code.claude.com/docs/en/skills
13. Claude Code MCP – Setup/Config. https://www.mcpbundles.com/blog/claude-code-mcp-tools · https://www.builder.io/blog/claude-code-mcp-servers · https://systemprompt.io/guides/claude-code-mcp-servers-extensions
14. Hooks reference – Claude Code Docs. https://code.claude.com/docs/en/hooks · ergänzend: https://thepromptshelf.dev/blog/claude-code-hooks-complete-reference-2026/
16. Get started with Claude Cowork – Claude Help Center. https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork
17. Cowork – Architektur/Capabilities (Tensorlake). https://www.tensorlake.ai/blog/claude-cowork-architecture-overview
18. Claude Cowork desktop architecture overview – Claude Help Center. https://support.claude.com/en/articles/14479288-claude-cowork-desktop-architecture-overview
19. Claude Cowork Architecture (M. Lanham). https://medium.com/@Micheal-Lanham/claude-cowork-architecture-how-anthropic-built-a-desktop-agent-that-actually-respects-your-files-cf601325df86
20. Use Claude Cowork safely – Claude Help Center. https://support.claude.com/en/articles/13364135-use-claude-cowork-safely
21. Use Claude Cowork on Team and Enterprise plans – Claude Help Center. https://support.claude.com/en/articles/13455879-use-claude-cowork-on-team-and-enterprise-plans
22. Making Claude Cowork ready for enterprise – Claude. https://claude.com/blog/cowork-for-enterprise
23. Our framework for developing safe and trustworthy agents – Anthropic. https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents · https://www.anthropic.com/research/trustworthy-agents
25. Measuring AI agent autonomy in practice – Anthropic. https://www.anthropic.com/research/measuring-agent-autonomy
26. Measuring AI agent autonomy in practice (News) – Anthropic. https://www.anthropic.com/news/measuring-agent-autonomy

---

*Hinweis: Dieses Dokument fasst öffentlich dokumentierte Best Practices zusammen. Produktdetails ändern sich; vor verbindlichem Einsatz gegen die offizielle Dokumentation der eingesetzten Version verifizieren.*
