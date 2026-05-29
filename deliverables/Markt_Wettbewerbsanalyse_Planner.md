# Markt- & Wettbewerbsanalyse — „Agent Operating Model Planner" (Arbeitsname „Lilli")

> Stand: 29.05.2026 · Auftrag: brutal ehrlich. Quellen am Ende.
> Bewertetes Produkt: ein **Project-to-Agent-Compiler** — aus einer Projektidee wird per
> McKinsey-Interview ein ZGPM-Plan (Meilensteine, RACI/PVM, Risiken, Token-Kosten) und daraus
> ein portabler Agent-Harness (CLAUDE.md, Skills, Agenten, Export-Zip für Claude Cowork/Code).

---

## 0. TL;DR — die ungeschönte Kurzfassung

1. **Den Namen „Lilli" sofort streichen.** „Lilli" ist der Name von **McKinseys hauseigener
   GenAI-Flaggschiff-Plattform**. Dein Tool basiert ausgerechnet auf McKinsey-Methodik und McKinsey
   publiziert genau deine These („the agentic organization"). Das ist die denkbar schlechteste
   Namenswahl: Marken-/Verwechslungsrisiko, wirkt abgekupfert, schwächt dich im Pitch. Kein Graubereich.
2. **Ein 1:1-Klon existiert nicht** — aber du bist von drei Seiten eingekreist: Runtime-Orchestrierung
   (CrewAI, IBM watsonx Orchestrate, LangGraph, Copilot Studio) *unter* dir, Governance/AgentOps
   (Credo AI, Maxim, AgentOps) *neben* dir, und Beratungen (McKinsey/Deloitte/EY/WEF) *über* dir, die
   genau dein Framing („Agent Operating Model", „RACI für Agenten") als Content besetzen.
3. **Die Nachfrage ist real, aber sie ist Nachfrage nach *Ergebnissen*, nicht nach „noch einem Planungstool".**
   Gartner: >40% der Agentic-AI-Projekte werden bis Ende 2027 abgebrochen; nur 21% haben ein reifes
   Governance-Modell; ~75% wollen in 2 Jahren Agentic AI. Das ist dein Schmerzpunkt — aber er wird
   heute primär mit Beratung und Governance-Software „gelöst", nicht mit einem Design-Tool.
4. **TAM ist groß, dein adressierbarer Software-Anteil ist klein.** Agentic-AI gesamt wächst mit
   ~44–47% CAGR auf zweistellige Mrd. $ — aber die *design-time-Planungsschicht*, die du verkaufst, ist
   ein dünner Streifen davon. Realistisches 3-Jahres-SOM für ein kleines Team: **~0,3–2 Mio. € ARR**
   (Bull-Case mit Marktplatz-Hit ~5 Mio.). Das ist ein gutes Wedge-/Feature-Geschäft, **kein
   offensichtliches 100-Mio.-Standalone-Unternehmen**.
5. **Bester Weg: nicht als breite SaaS-Plattform starten**, sondern als **methodisches Wedge**
   (Template-/Skill-Packs + „RACI-to-Subagents"-Compiler) über **Marktplätze** (Atlassian/Rovo,
   Claude/MCP, GitHub, AWS/Azure) und **Beratungs-Kooperationen**. Verteidigung = Methodik/Ontologie,
   nicht Code (Code ist in einem Wochenende kopierbar).

**Verdikt:** Spannender Keil mit echtem Schmerzpunkt — aber als eigenständiges Massenprodukt fragil.
Eng fokussieren, über Methodik + Distribution verteidigen, Namen wechseln.

---

## 1. Gibt es das Tool schon? — Wettbewerbslandkarte in 3 Schichten

Dein Produkt sitzt in einer **Lücke zwischen drei besetzten Schichten**. Das ist gleichzeitig Chance
(keiner macht genau das) und Gefahr (jeder Nachbar kann nach oben/unten expandieren).

| Schicht | Wer dominiert | Was sie tun | Verhältnis zu dir |
|---|---|---|---|
| **Runtime / Orchestrierung** | CrewAI, LangGraph, AutoGen, IBM watsonx Orchestrate, MS Copilot Studio, Vertex Agent Builder, n8n/Flowise/Langflow | Agenten *bauen & ausführen* (Nodes, Tools, Flows) | **Unter dir.** Du erzeugst das, was sie ausführen. Sie können „Planung" als Feature nachrüsten. |
| **Governance / AgentOps** | Credo AI (GAIA), Modulos, AgentOps, Maxim/Bifrost, LangSmith | Agenten *überwachen, auditieren, compliant halten* (Runtime) | **Neben dir.** Du machst Design-time-Governance (RACI, Gates), sie Runtime-Governance. Komplementär — oder Konkurrenz, wenn sie nach links wandern. |
| **Beratungs-Frameworks** | McKinsey („agentic organization"/Lilli), Deloitte, EY, WEF, Digital Workforce | „Operating Model", „RACI für Agenten" als *Methodik & Beratung* | **Über dir.** Sie besetzen dein Narrativ, verkaufen es aber als Mandat, nicht als Tool. |

**Die eigentliche Lücke (dein White Space):** *Design-time, methodengetrieben, „vom Projektplan zum
lauffähigen Agententeam".* Ein **Project-to-Agent-Compiler** mit echter PM-Methodik (Meilensteine als
Zustände, PVM/RACI-Konsistenzregeln, Risikoampel, Token-Budget) habe ich als benanntes Produkt **nicht**
gefunden. Das ist genuin neu.

**Aber brutal:** „Nicht gefunden" ≠ „verteidigbar". Die Bausteine (RACI→Subagent, SKILL.md-Generator,
LangGraph-Export) sind einzeln trivial nachbaubar. Dein Moat ist **nicht das Tool**, sondern die
**Methodik-Tiefe + Templates + Ontologie + Marke** (vgl. TOGAF/ITIL/PRINCE2: die Methode war der Wert,
nicht die Software).

---

## 2. B2B-Marktnachfrage — ja, aber mit Vorsicht zu interpretieren

**Starke Nachfragesignale:**

- ~75% der Unternehmen wollen binnen 2 Jahren Agentic AI einsetzen; >50% adoptieren 2026
  Orchestrierungsplattformen; 57% betreiben bereits mehrstufige Agenten-Workflows produktiv.
- **Nur 21%** haben ein reifes Agenten-Governance-Modell → riesige Reife-Lücke.
- **Gartner: >40% der Agentic-AI-Projekte werden bis Ende 2027 abgebrochen** — primär wegen unklarer
  Ziele, fehlender Governance und Organisationsdesign. **Genau dein Pitch.**

**Die ehrliche Kehrseite:**

- Nachfrage besteht nach **funktionierenden Agenten und nachweisbarem ROI**, nicht explizit nach einem
  „Planungs-/Operating-Model-Tool". Du musst den Bedarf erst *übersetzen* („deshalb scheitern eure
  Projekte → deshalb braucht ihr Design-First"). Das ist Missionsverkauf = teurer, längerer Sales-Cycle.
- Der Käufer ist unklar: Solo-Builder/Agentur (zahlt wenig, churnt schnell) vs. Enterprise-PMO/AI-CoE
  (zahlt viel, kauft aber lieber von Beratung + etabliertem Governance-Vendor). **Zwei sehr verschiedene
  Produkte.** Beide gleichzeitig = Tod durch Fokusverlust.
- „Operating Model" ist ein Beratungs-Buzzword von 2025/26 → Hype-Risiko: Wenn die Welle bricht,
  steht ein Tool, das auf dem Buzzword reitet, nackt da.

---

## 3. TAM / SAM / SOM — transparent hergeleitet (grobe Schätzung, keine Marktstudie)

**Top-down (Realitätscheck):** Agentic-AI-Software gesamt ~7–8 Mrd. $ (2025) → ~40–53 Mrd. $ (2030),
CAGR ~44–47%. Davon ist das meiste *Runtime & Anwendungen*. Die *Design-/Orchestrierungs-Tooling- +
AgentOps-Schicht* ist grob 10–15% → ~4–6 Mrd. $ (2030). Deine *design-time-Planungs-Nische* ist davon
wiederum nur ein Bruchteil.

**Bottom-up (wer zahlt wirklich):**

| Ebene | Annahme | Rechnung | Ergebnis |
|---|---|---|---|
| **TAM** | Alle, die Agenten organisiert bauen müssen (Builder/Agenturen + Enterprises mit AI-CoE), weltweit | ~25–40k zahlende Orgs × ~10–30k $/Jahr (Mix Seats+Templates+Services) | **~0,5–1,2 Mrd. $/Jahr** |
| **SAM** | Realistisch bedienbar: EU-first, Mid-Market + Builder-Segment, 3-Jahres-Horizont, claude-/methodikaffin | ~10–15% des TAM | **~150–400 Mio. $/Jahr** |
| **SOM** | Was ein kleines Team in 3 Jahren tatsächlich holt (0,1–0,5% des SAM) | — | **~0,3–2 Mio. $ ARR** (Bull mit Marktplatz-Hit ~5 Mio.) |

**Brutal:** Die Zahlen tragen ein **Feature/Wedge-Geschäft oder ein Beratungs-Plus-Tool**, nicht
selbstverständlich ein VC-skaliertes Standalone-SaaS. Wenn das Ziel ein 100-Mio.-Unternehmen ist, ist
dieses Tool eher *Einstiegskeil* als das Endspiel.

---

## 4. Go-to-Market B2B — Marktplätze & Kooperationen

**Marktplätze (dein größter Hebel, weil du sonst keine Distribution hast):**

| Kanal | Warum stark | Konkreter Move |
|---|---|---|
| **Atlassian Marketplace / Rovo** | Rovo hat `rovo:agentConnector` für externe Agenten + Partner-Agenten (Figma, Canva, Replit, GitHub Copilot) live; Käufer sitzen schon in Jira | Compiler-Output als Rovo-Agent/Forge-App publizieren; „Plane dein Jira-Epic → Agententeam". **Stärkster Wedge.** |
| **Claude Plugin / MCP Registry** | Dein Harness ist bereits Claude-native (CLAUDE.md, Skills, Cowork-Plugin) | Als Cowork-Plugin + MCP-Server listen; native Heimat deiner Zielgruppe |
| **GitHub Marketplace** | Builder leben dort; Harness ist git-basiert | „Project-to-Agent"-Action / Template-Repos |
| **AWS / Azure Marketplace** | Enterprise-Beschaffung, Budget-Abruf | Später, für Enterprise-Tier (du bist eh Azure-native) |

**Kooperationen:**

- **Anthropic-Ökosystem** — als Referenz-Workflow „from plan to Claude Code agents" (du nutzt es ohnehin).
- **Boutique-/Mid-Tier-Beratungen** (nicht McKinsey — die sind Konkurrenz) als Co-Selling: Tool liefert
  die Methodik-Skalierung, die Beratung das Mandat. Win-win, und dein realistischster Enterprise-Zugang.
- **PM-Tool-Anbieter** (Atlassian, Linear, monday) als Integrations-Partner.
- **System-Integratoren** (regional, DACH/EU-Rechtsräume-Fokus passt zu AEGIRA) für Implementierung.

**Motion:** PLG-Wedge (kostenloses „RACI→Subagents" / SKILL.md-Generator) → Template-/Governance-Packs
verkaufen → Team-Tier → Enterprise via Beratungs-Co-Sell. **Nicht** mit der großen Plattform starten.

---

## 5. Fehlende Features / Gut / Schlecht

**Gut (echte Stärken):**

- **Methodik-First** (ZGPM + McKinsey-Prinzipien) ist ein glaubwürdiger Differenzierer in einem Feld
  voller „Prompt→Tool→Workflow"-Spielzeuge.
- **Design-time-Governance** (HITL-Gates, RACI-Konsistenz, Risikoampel) trifft exakt den 40%-Abbruch-Schmerz.
- **Portabler Export** (kein Vendor-Lock-in, Claude-native) ist sympathisch und vertrauensbildend.
- **Token-/Ressourcen-Budgetierung pro Agent** ist ein selten sauber gelöstes, B2B-relevantes Feature.

**Schlecht / Risiken:**

- **Dünner technischer Moat** — Kernfunktionen in Tagen nachbaubar.
- **Käufer-Ambiguität** (Solo vs. Enterprise) und **Missionsverkauf** nötig.
- **Abhängigkeit vom Claude-Ökosystem** — schön für Fokus, riskant für TAM.
- **„Lilli"-Name** (s. o.).
- **Bezug zu AEGIRA unklar:** AEGIRA = Trust-Infrastructure; dieses Tool = Agenten-Planung. Entweder
  klar als AEGIRA-Modul positionieren (Trust-by-Design im Agenten-Bau) oder als eigenes Produkt
  ausgründen — aber nicht verschwimmen lassen.

**Fehlende Features (für B2B-Ernsthaftigkeit nötig):**

- **Bidirektionale Integrationen** (Jira/Linear: Plan ↔ Tickets sync, nicht nur Export).
- **Runtime-Feedback-Loop:** Ist-Daten aus dem Lauf zurück in den Plan (sonst bist du nur „Planung",
  die nach Tag 1 veraltet). Anbindung an AgentOps/LangSmith.
- **Team-Kollaboration & Rollen/SSO/Audit-Trail** (Enterprise-Pflicht).
- **Template-Bibliothek/Marktplatz** (Branchen-Blueprints = dein wiederkehrender Umsatz + Moat).
- **Compliance-Mapping** (EU AI Act / ISO 42001) als Modul — passt zu AEGIRA, zahlt auf „audit-ready" ein.
- **Kosten-/ROI-Reporting** für den Business-Käufer.
- **Multi-LLM/Framework-Export** (nicht nur Claude: auch LangGraph/CrewAI), um TAM nicht selbst zu deckeln.

---

## 6. Integrationen — wo andocken?

- **Jira / Atlassian Rovo (Priorität 1):** über `rovo:agentConnector` + Forge + Marketplace. Plan→Epics,
  Meilensteine→Sprints, PVM→Verantwortliche, Agenten als Rovo-Teammates. Stärkster, kaufbereiter Kanal.
- **Linear / monday / Asana:** schlanke Plan-Sync-Integrationen für das Builder-/Mid-Market-Segment.
- **GitHub:** Harness-Repo-Erzeugung, Actions, Releases (hast du via PAT-MCP schon angelegt).
- **Slack/Teams:** HITL-Approvals & Statusberichte dort, wo Menschen entscheiden.
- **AgentOps/LangSmith/Maxim:** Runtime-Telemetrie zurück in den Plan (schließt die Feedback-Lücke).
- **n8n/Make/Zapier:** für die No-Code-Long-Tail-Distribution.

---

## 7. Preis — Benchmark & Empfehlung

**Benchmark (B2B-Agenten-Tools, 2026):** CrewAI Free → ~25 $/Mo (Pro) → ~99 $/Mo → Enterprise
~60–120k $/Jahr; Lindy ab ~50 $/Mo; Branche überwiegend **nutzungs-/execution-basiert**, nicht rein
pro Sitz. LLM-Kosten oft eingepreist (versteckt die Unit-Economics).

**Empfehlung (hybrid: Sitz für Planung + Verbrauch für Compile/Run + Packs):**

| Tier | Zielgruppe | Preis (Richtwert) | Inhalt |
|---|---|---|---|
| **Free / Wedge** | Solo-Builder | 0 € | 1 Projekt, RACI→Subagents, SKILL.md-Gen, Export mit Wasserzeichen |
| **Pro** | Builder/Agentur | **39–59 €/Monat/Nutzer** | Unbegrenzte Projekte, voller ZGPM-Plan, Gantt/Risk/Token, alle Exporte |
| **Team** | Mid-Market | **300–600 €/Monat** (5 Seats inkl.) + Compile-Kontingent | Kollaboration, SSO, Audit-Trail, Jira/Linear-Sync |
| **Enterprise** | AI-CoE/PMO | **25–75k €/Jahr** | EU-Hosting, Compliance-Mapping, Beratungs-Co-Sell, Support |
| **Template-/Governance-Packs** | alle | **49–499 € einmalig/Pack** | Branchen-Blueprints, EU-AI-Act-Pack — wiederkehrender Marge & Moat |

Prinzip: **niedrige Einstiegshürde (Wedge) + Verbrauch für das teure Stück (Compile/Run) + Packs als
Margen- und Verteidigungsschicht.** Keine 100%-Garantien bewerben (AEGIRA-Constitution: „nachweisbar,
audit-ready", nicht „garantiert").

---

## 8. Name „Lilli" — klare Absage

- **McKinsey nennt seine zentrale GenAI-Plattform „Lilli"** (nach Lillian Dombrowski, 1945). Sie ist
  intern bei zehntausenden Beratern im Einsatz und öffentlich stark kommuniziert.
- Dein Tool **basiert auf McKinsey-Methodik** und McKinsey **publiziert genau deine These**
  („the agentic organization"). „Lilli" zu nennen = Verwechslung quasi garantiert, Markenrisiko real,
  und es lässt dich wie eine Kopie aussehen. **Kein Upside, nur Downside.**
- **Empfehlung:** anderer Name. Profilschärfung Richtung „Operating Model / Workforce / Compiler",
  z. B. in Richtung *Cohort, Mustering, Crewframe, Orchestra, Atelier, Helm, Cadence* o. Ä.
  (vor Wahl: EUIPO/DPMA-Marken- + Domain-Check, und Klassen 9/42 prüfen).

---

## 9. Brutale Schlussbewertung & nächster Zug

**Was wirklich gut ist:** Du hast einen echten, von Gartner belegten Schmerz (40% Abbruch) und einen
glaubwürdigen, seltenen Winkel (Methodik-First, Design-time-Governance, portabler Export).

**Was dich umbringt, wenn du es ignorierst:** dünner Moat, Käufer-Ambiguität, Missionsverkauf,
Hype-Abhängigkeit, der Name, und die Versuchung, sofort die „große Plattform" zu bauen.

**Empfohlener nächster Zug (90 Tage):**
1. **Name wechseln** + Marken-/Domain-Check.
2. **Einen** Käufer wählen — Empfehlung: **Builder/Agenturen über Atlassian-Rovo + Claude/MCP**, nicht Enterprise.
3. **Wedge statt Plattform:** „RACI→Subagents + SKILL.md-Compiler" als kostenloses Marktplatz-Tool ausliefern,
   Telemetrie über Aktivierung/Retention sammeln (echte Nachfrage messen, nicht annehmen).
4. **3–5 Branchen-Template-Packs** bauen (= Umsatz + Moat).
5. **2 Beratungs-Kooperationen** für den Enterprise-Beweis anbahnen.
6. Erst bei belegter Aktivierung/Retention die Plattform + Enterprise-Tier ausbauen.

**Faustregel:** Wenn das kostenlose Wedge nicht organisch ret, ist die „große Vision" Wunschdenken —
und du hast es mit minimalem Einsatz herausgefunden.

---

## Quellen

- McKinsey „Lilli": mckinsey.com (Meet Lilli / Rewiring the way McKinsey works), ciodive.com
- „The agentic organization" (Operating Model): mckinsey.com
- Orchestrierungs-/Multi-Agent-Markt & Gartner-Abbruchquote: codebridge.tech, atlan.com, augmentcode.com, monday.com
- AI-Workforce/Operating-Model/RACI: elevateconsult.com, deloitte.com, ey.com, weforum.org, writer.com, digitalworkforce.com
- Pricing: lindy.ai, crewai.com, checkthat.ai, zenml.io
- Atlassian Rovo / Forge / Marketplace: developer.atlassian.com, atlassian.com, community.atlassian.com
- Marktgrößen (Agentic AI): marketsandmarkets.com, grandviewresearch.com, mordorintelligence.com
- Governance/AgentOps: credo.ai, modulos.ai, aimultiple.com
