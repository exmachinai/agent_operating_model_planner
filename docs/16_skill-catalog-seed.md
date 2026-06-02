# Skill-Katalog — Seed (world-class, extern gevettet)

> Status: **Recherche-Ergebnis / Seed für `harness/skill_catalog.py`** (v0.7, ergänzt `docs/15`).
> Scope: **externe, weltklasse Skills**. **Keine AEGIRA-eigenen Methoden-/Risiko-Skills** in diesem Seed
> (separater `aegira-certified`-Strang, vgl. `docs/15` §4.2).
> Sprache Deutsch, Code-Identifier englisch. Stand: **Juni 2026**.

---

## 0. Vorbemerkung (Methodik & Trust)

Die Auswahl ist MECE über die Agentenrollen aus `harness/catalog.py` und priorisiert **offiziell von
Herstellern publizierte** Skills (Anthropic, HashiCorp, Trail of Bits, Snyk, Vercel u. a.) vor populären
Community-Skills. Grund: Snyks **ToxicSkills**-Studie (Feb 2026) fand bei 3.984 gescannten Skills
**13,4 % mit kritischen Schwachstellen und 76 mit Schad-Payloads**. Daraus folgt: **Nur `anthropic-vetted` und
`world-top` werden vorselektiert; `community`/`experimental` sind sichtbar, aber nie Default und durchlaufen das
Security-Gate** (`docs/15` §4.6).

**Versionen/Daten sind ein Momentaufnahme-Stand** und werden zur Katalog-Build-Zeit frisch aus der Quelle
gezogen (inkl. `content_sha256`), nicht aus diesem Dokument. Wo unverifiziert: „n/v".

---

## 1. Namens-Konvention (eindeutige Bezeichnung)

Jeder Skill erhält eine **eindeutige AEGIRA-Katalog-ID** (`catalog_id`) nach dem Schema:

```
<funktion-in-kebab-case>_skill        Regex: ^[a-z0-9-]+_skill$
Beispiele: ux-design_skill · code-review_skill · security-audit_skill
```

Die `catalog_id` ist die **eindeutige Anzeige-/Referenzbezeichnung** in UI, Katalog und Audit-Manifest.
Davon getrennt bleibt der **Upstream-`slug`** (= Ordnername `.claude/skills/<slug>/` und Frontmatter `name:`),
der dem offenen Standard folgt (nur Kleinbuchstaben/Ziffern/Bindestriche, **kein** Unterstrich). So bleibt die
Bezeichnung eindeutig **und** der `SKILL.md`-Standard gewahrt.

---

## 2. Trust-Tier-Legende

| Tier | Bedeutung | Vorselektiert? |
|---|---|---|
| `anthropic-vetted` | offiziell von Anthropic (`anthropics/skills`) | ja |
| `world-top` | offiziell von etabliertem Hersteller **oder** breit installiert + manuell gevettet | ja |
| `community` | öffentlich, reputabel, aber ungeprüft | nein (Security-Gate) |
| `experimental` | mächtig, aber hohes Risiko/in Erprobung | nein (HITL-Pflicht) |

---

## 3. Kuratierter Seed-Katalog (33 Skills)

> **Materialisiert im Repo:** Alle 33 Skills liegen physisch unter
> `harness/skill_catalog/` — lauffähige Registry `skill_catalog.py`, je Skill eine
> `skills/<catalog_id>/SKILL.md` (Frontmatter + Provenance) und ein `_manifest.json`.
> Die `SKILL.md` sind AEGIRA-Katalog-Referenzen; Fremdinhalt wird zur Build-Zeit hydriert.

### 3.1 Output & Dokumente → Doku-Agent (rollenübergreifend)

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/Risk | Stand |
|---|---|---|---|---|---|
| `docx-export_skill` | docx | Anthropic | anthropic-vetted | Datei-IO, low | offiziell |
| `pptx-export_skill` | pptx | Anthropic | anthropic-vetted | Datei-IO, low | offiziell |
| `pdf-toolkit_skill` | pdf | Anthropic | anthropic-vetted | Datei-IO, low | offiziell |
| `xlsx-sheets_skill` | xlsx | Anthropic | anthropic-vetted | Datei-IO, low | offiziell |
| `brand-guidelines_skill` | brand-guidelines | Anthropic | anthropic-vetted | Doc/Style, low | offiziell |
| `canvas-design_skill` | canvas-design | Anthropic | anthropic-vetted | Bild/PDF, low | offiziell |
| `readme-gen_skill` | readme-generator | Community | community | Datei-IO, low | breit installiert |
| `changelog-gen_skill` | changelog-generator | Community | community | Datei-IO, low | breit installiert |

### 3.2 Implementierung & Git-Workflow → Implementierungs-Agent

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/Risk | Stand |
|---|---|---|---|---|---|
| `webapp-testing_skill` | webapp-testing | Anthropic | anthropic-vetted | Browser/Playwright, medium | offiziell · dient auch Test/QA (3.7) |
| `mcp-builder_skill` | mcp-builder | Anthropic | anthropic-vetted | Code, low | offiziell |
| `git-commit_skill` | git-commit-writer | Community | community | git, low | Top-installiert 2026 |
| `pr-description_skill` | pr-description-writer | Community | community | git/SCM, low | Top-installiert 2026 |
| `env-doctor_skill` | env-doctor | Community | community | Shell/Read, medium | breit installiert |

### 3.3 Architektur, DevOps & IaC → Architektur-Agent, DevOps-Agent

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/Risk | Stand |
|---|---|---|---|---|---|
| `terraform-iac_skill` | terraform | HashiCorp (`hashicorp/agent-skills`) | world-top | IaC, high (Deploy=HITL) | offiziell, Jan 2026 |
| `packer-build_skill` | packer | HashiCorp | world-top | IaC/Build, medium | offiziell, Jan 2026 |
| `terraform-grounding_skill` | terrashark | `LukasNiessen/terrashark` | community | IaC, medium | gegen Halluzination |

### 3.4 Data → Daten-Agent

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/MCP, Risk | Stand |
|---|---|---|---|---|---|
| `sql-database_skill` | sql-queries / postgres | AEGIRA-Stack `data:*` / Community | world-top* | DB-Query, medium | im Stack verfügbar |
| `orm-migration_skill` | prisma / sqlalchemy | Community | community | Code/Migration, medium | etabliert |
| `data-viz_skill` | create-viz / data-visualization | AEGIRA-Stack `data:*` | world-top* | Code/Plot, low | im Stack verfügbar |
| `data-analyze_skill` | analyze / explore-data | AEGIRA-Stack `data:*` | world-top* | Query/Analyse, low | im Stack verfügbar |

\* Die installierten **`data:*`-Plugin-Skills** (analyze, build-dashboard, create-viz, explore-data,
sql-queries, statistical-analysis, validate-data) als `world-top` führen — bereits im AEGIRA-Stack gepflegt.

### 3.5 Security & Red-Team → Security-Agent, Red-Team/Critic-Agent

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/Risk | Stand |
|---|---|---|---|---|---|
| `security-audit_skill` | trailofbits suite | Trail of Bits (`trailofbits/skills`) | world-top | Scan/Read, medium | „Gold-Standard" |
| `vuln-remediation_skill` | snyk | Snyk | world-top | Scan + optional PR, high | offiziell |
| `pentest-autonomous_skill` | shannon | Community/Forschung | experimental | Exploit-Ausführung, high | XBOW 96,15 % — **HITL-Pflicht** |

### 3.6 UX/Design → UX/Design-Agent (+ Reviewer)

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/Risk | Stand |
|---|---|---|---|---|---|
| `ux-design_skill` | frontend-design | Anthropic | anthropic-vetted | Code/Design, low | 277k+ Installs, Feb 2026 |
| `web-design-review_skill` | web-design-guidelines | Vercel | world-top | Review/Read, low | 100+ Regeln a11y/Perf/UX |
| `theme-factory_skill` | theme-factory | Anthropic | anthropic-vetted | Style, low | offiziell |
| `accessibility-audit_skill` | accessibility-review | AEGIRA-Stack `design:*` | world-top* | Review/Read, low | WCAG 2.1 AA |

### 3.7 Test/QA → Test-Agent, Reviewer/QA-Agent

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/Risk | Stand |
|---|---|---|---|---|---|
| `code-review_skill` | code-review | reputable Vendor/Community | world-top† | Read/Diff, low | meistinstalliert 2026 |
| `tdd-enforcement_skill` | superpowers-tdd | Community | community | Test/Code, low | etabliert |

† nur `world-top`, wenn aus reputabler Quelle gevettet; generische Forks bleiben `community`.
Die End-to-End-Browser-Prüfung deckt `webapp-testing_skill` (3.2) ab — kein eigener Eintrag (Merge).

### 3.8 Research, Prompting & PM → Research-Agent, PMO-Orchestrator

| catalog_id | Upstream-slug | Autor/Quelle | Trust | Tools/Risk | Stand |
|---|---|---|---|---|---|
| `deep-research_skill` | deep-research | Anthropic-nah | world-top | Web-Search, low | Fan-out + Verifikation |
| `prompting_skill` | prompting-best-practices | Anthropic | anthropic-vetted | Doc, low | offiziell |
| `skill-creator_skill` | skill-creator | Anthropic | anthropic-vetted | Datei-IO, low | offiziell |
| `prd-authoring_skill` | prd-creation | Community | community | Doc, low | PM-Workflow |

---

## 4. Bewusst NICHT aufgenommen (Katalog-Anti-Scope)

- **AEGIRA-eigene Methoden-/Risiko-Skills** — gehören in den `aegira-certified`-Strang, nicht in diesen externen
  Seed (Auftrag: keine eigenen Methoden-Skills hier).
- **Community-Skills als Default** — sichtbar, aber nie vorselektiert (ToxicSkills-Risiko).
- **Skills mit verdecktem Netzwerk-/Credential-Zugriff** — nur nach Security-Review; sonst raus.
- **Plattform-fremde Skills** (außerhalb `target_platform`) — bestehende Skill-Mapping-Regel.
- **Marken-suggestive Methoden-Skills** (PwC/MITRE/GMS) — Eckpfeiler.
- **Skills mit „100 %"-Versprechen** in der Beschreibung — Eckpfeiler.

---

## 5. Pflege & Vetting (verbindlich)

1. `catalog_id` ist eindeutig und stabil; Umbenennen nur per Deprecation, nie still.
2. `version`/`sha256` zur **Build-Zeit** aus der Quelle ziehen, nicht aus diesem Dokument.
3. `world-top`-Aufnahme nur mit dokumentierter Quelle (`source`-URL) + Lizenzprüfung.
4. `community`/`experimental` durchlaufen das **Security-Gate** (`has_scripts`, HITL) vor ZIP-Aufnahme.
5. Quartalsweises Re-Vetting; Deprecation-Flag statt stillem Entfernen.
6. Jeder Skill mit `has_scripts=true`: manueller Security-Review (ToxicSkills-Lehre).

---

## 6. Quellen

- Anthropic offizielle Skills (17) — github.com/anthropics/skills
- HashiCorp Agent Skills (Terraform/Packer) — hashicorp.com/blog/introducing-hashicorp-agent-skills
- Trail of Bits Skills — github.com/trailofbits/skills
- Snyk: Top-Skills + ToxicSkills-Studie — snyk.io/articles
- Vercel Web Design Guidelines; Anthropic Frontend Design (Installs/Stand) — Recherche Juni 2026
- VoltAgent/awesome-agent-skills (1000+ kuratiert) — github.com/VoltAgent/awesome-agent-skills
