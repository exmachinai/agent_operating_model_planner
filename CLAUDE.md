# CLAUDE.md — Operating Instructions für Claude-Agenten

Dieses Dokument steuert das Verhalten von Claude-Code, Cowork und allen Subagenten, die in diesem Repo arbeiten. **Lies es zuerst.**

---

## Identität und Mission

Dieses Repo ist Teil der **AEGIRA AI Trust Platform** von exmachinAI. AEGIRA ist **Trust-Infrastructure**, nicht Compliance-Software (Compliance ist die Folge). Buyer-Promise: „Evidence-based AI Trust — nachweisbar, audit-ready".

**Verboten:**

- Keine 100%-Garantien oder absoluten Claims.
- Niemals „DACH" verwenden. Kundenrechtsräume sind `DE` · `EU27-Rest` · `UK` · `CH`. US-Nexus ist Vendor-Layer.
- Maturity = AIMS (ISO 42001 × CMMI v3). MITRE und GMS sind deprecated als Primärmodell (MITRE höchstens als Tiefenanalyse via Skill).
- Produktnamen sind eingefroren: **AI Navigator** / **AI Guardian** / **AI Commander**. Keine anderen.
- ZGPM = **Zielgeführtes Generatives Projekt Management**. Methodisch genutzt; in der user-sichtbaren App-UI vermieden (Persona = Lower-Medium Coder), intern/im Harness-Deliverable zulässig.

## Knowledge-Repo (Constitution)

Die kanonische Norm liegt **außerhalb dieses Repos** im versionierten Knowledge-Repo:

```
<Dropbox>/02_exmachinAI_GmbH/02_Projekte/01_AEGIRA_AI_TRUST_PLATFORM/00_CLAUDE_KNOWLEDGE_ARCHITECTURE/
```

Lade-Reihenfolge (aus User-Preferences):
1. `README-LOAD-ORDER`
2. `/constitution` — 4 Dateien als verbindlicher Rahmen
3. `/runtime` — frisch für aktuellen Stand
4. `/library` — nur bei Bedarf
5. `/archive` und `/experiments` — niemals

**Bei Konflikt zwischen Dokumenten gewinnt die Constitution.** Frage das Repo, statt aus dem Gedächtnis zu antworten.

## Drei Zonen

Die Projekt-Ordnerstruktur folgt der Constitution-CANONICAL-Norm:

- **Zone 1 USER-FILES** — `/10_USER_FILES/USER-XXX/_INBOX|_DRAFT|_ARCHIVE/`. Persönlich. Wird vom Cowork-Nachtlauf rekursiv gescannt.
- **Zone 2 REPO** — `/00_CLAUDE_KNOWLEDGE_ARCHITECTURE/`. Kanonisch. **Nur** der Knowledge-Manager schreibt.
- **Zone 3 TEAM-FOLDERS** — alle anderen Top-Level-Ordner. Kollaborativ. Wird nicht gescannt, keine Naming-Pflicht.

**Dieses Repo selbst ist Zone-3.** Es darf nicht in Zone 2 schreiben. Der `github-pat-mcp-server` hat einen Constitution-Safety-Guard, der Writes auf `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**` standardmäßig blockiert.

## Eingefrorene Eckpfeiler

Diese gelten auch ohne geladenes Knowledge-Repo. Sie ändern sich nie:

- **Trust-Infrastructure**, nicht Compliance-Software.
- **Forcing Event**: EU AI Act Enforcement am **02.12.2027** (Digital Omnibus).
- **Maturity**: AIMS.
- **Rechtsräume**: DE / EU27-Rest / UK / CH.
- **Produkte**: AI Navigator / AI Guardian / AI Commander.
- **User-Files** in `/10_USER_FILES/USER-XXX/_INBOX/` folgen `YYMMDD_HHMM_USER-XXX_THEMA-KURZ.ext`.

## Arbeits-Regeln in diesem Repo

1. **Vor Code: Plan.** Bei nicht-trivialen Änderungen erst `docs/` aktualisieren, dann Code.
2. **Methodentreue.** Pläne in diesem Repo folgen ZGPM (siehe `docs/01_zgpm-method.md`) plus McKinsey-Prinzipien (MECE, Pyramid, Hypothesis-driven).
3. **Keine Secrets im Klartext.** `.env.example` zeigt Schlüssel, `.env` ist gitignored.
4. **PRs gegen `main`** mit klarem Titel im Imperativ, verlinktes Issue, Test-Belege.
5. **Sprache**: Doku-Hauptsprache ist Deutsch, Code-Identifier englisch.

## Wenn du unsicher bist

Frage zurück. Nutze das Repo. Erfinde keine Personen, Pricing-Modelle, Personas — sie stehen im Knowledge-Repo und ändern sich. Lieber „weiß ich nicht ohne Repo-Load" als geraten.
