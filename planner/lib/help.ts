/**
 * Inhalt der In-App-Hilfe. Eine einzige Quelle für den Hilfe-Drawer (pro Seite)
 * und die /guide-Seite (Gesamtübersicht). Bewusst als Daten gehalten, damit
 * beide Oberflächen denselben Text rendern und der User-Guide konsistent bleibt.
 *
 * Sprache: Deutsch (Nutzeroberfläche). Begriffe folgen der Constitution:
 * Trust-Infrastructure, AIMS, Rechtsräume DE/EU27-Rest/UK/CH, strukturierte Planung.
 */

export type HelpTopic =
  | "overview"
  | "new"
  | "interview"
  | "understanding"
  | "guardrails"
  | "plan"
  | "review"
  | "harness"
  | "export";

export interface HelpSection {
  heading: string;
  body: string[];
  /** Stabiler Anker zum Deep-Linking aus dem Arbeitsbereich (sonst aus heading abgeleitet). */
  id?: string;
}

/** Slug eines Section-Headings — für Deep-Link-Anker (Arbeitsbereich → Hilfe-Sektion). */
export function sectionId(s: HelpSection): string {
  return (
    s.id ??
    s.heading
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export interface HelpEntry {
  /** Prozess-Marker, z. B. "Schritt 2" oder "Gate 1". */
  marker: string;
  title: string;
  /** Ein-Satz-Zweck für Drawer-Kopf und Guide-Teaser. */
  summary: string;
  sections: HelpSection[];
  /** Konkrete Hinweise „so kommst du weiter". */
  tips: string[];
}

/**
 * Die drei HITL-Gates als wiederverwendbare Bausteine. Gates sind bewusst kein
 * eigener Topic — sie erscheinen im Kontext des Schritts, der sie auslöst.
 */
export const GATES: Record<"gate1" | "gate2" | "gate3", HelpEntry> = {
  gate1: {
    marker: "Gate 1",
    title: "Verständnis-Freigabe",
    summary:
      "Du bestätigst, dass die KI dein Vorhaben richtig verstanden hat — danach ist der Kontext eingefroren.",
    sections: [
      {
        heading: "Was passiert hier",
        body: [
          "Mit der Freigabe erklärst du das gemeinsame Verständnis (Projekt-Natur, Zielplattform, Zusammenfassung) für verbindlich.",
          "Alle hochgeladenen Kontext-Quellen werden zu diesem Zeitpunkt eingefroren (frozen_at) und damit zum nachweisbaren, zitierbaren Evidenz-Stand für die spätere Planung.",
        ],
      },
      {
        heading: "Warum das ein Gate ist",
        body: [
          "Ab hier baut die Planung auf deinem bestätigten Verständnis auf. Ein sauberer Schnitt verhindert, dass sich die Grundannahmen still unter dem Plan verschieben.",
        ],
      },
    ],
    tips: [
      "Vor der Freigabe Kontext-Quellen prüfen — nach Gate 1 sind Upload und Entfernen gesperrt.",
      "Die Freigabe ist eine bewusste menschliche Entscheidung (Human-in-the-Loop), keine Formalie.",
    ],
  },
  gate2: {
    marker: "Gate 2",
    title: "Plan-Freigabe",
    summary:
      "Du prüfst und editierst den Plan und gibst die Version frei, die gebaut werden soll.",
    sections: [
      {
        heading: "Was passiert hier",
        body: [
          "Du siehst den generierten Plan mit Reviewer-Befunden und kannst ihn inline anpassen, bevor du ihn freigibst.",
          "Jede Freigabe erzeugt eine neue, unveränderliche Plan-Version (append-only) mit eigenem plan_hash — der Verlauf bleibt nachvollziehbar.",
        ],
      },
      {
        heading: "Warum das ein Gate ist",
        body: [
          "Der freigegebene Plan ist die Bauvorlage für den Harness. Was hier steht, wird umgesetzt — deshalb die explizite menschliche Abnahme.",
        ],
      },
    ],
    tips: [
      "Reviewer-Befunde mit Schweregrad „fail“ zuerst klären — sie blockieren eine belastbare Freigabe.",
      "Vergleiche bei Bedarf die Versionen, um zu sehen, was sich seit der letzten Freigabe geändert hat.",
    ],
  },
  gate3: {
    marker: "Gate 3",
    title: "Export-Freigabe",
    summary:
      "Du gibst den kompilierten Agent-Harness für den Export frei — der Abschluss des Vorhabens.",
    sections: [
      {
        heading: "Was passiert hier",
        body: [
          "Der Harness wird aus dem freigegebenen Plan kompiliert und für den Export bereitgestellt.",
          "Mit dem Export endet der Wirkungsbereich der eingespeisten Kontext-Quellen — sie waren Mittel zur Schärfung und Planung, kein dauerhafter Betriebsspeicher.",
        ],
      },
    ],
    tips: [
      "Prüfe vor dem Export, dass der zugrunde liegende Plan der ist, den du freigegeben hast (plan_hash).",
    ],
  },
};

export const HELP: Record<HelpTopic, HelpEntry> = {
  overview: {
    marker: "Start",
    title: "Projekt-Übersicht",
    summary:
      "Einstiegspunkt: alle Vorhaben auf einen Blick, Status und Gate-Fortschritt.",
    sections: [
      {
        heading: "Der Planner in drei Phasen",
        body: [
          "VERSTEHEN — Vorhaben beschreiben, im Interview schärfen, Verständnis freigeben (Gate 1).",
          "PLANEN — Kontext verwalten, Leitplanken prüfen, Plan erzeugen, Plan freigeben (Gate 2).",
          "BAUEN — Agent-Harness kompilieren, exportieren (Gate 3).",
        ],
      },
      {
        heading: "Was AEGIRA hier liefert",
        body: [
          "Der Planner ist Trust-Infrastructure: Jeder Schritt erzeugt nachvollziehbare Evidenz, statt nur ein Ergebnis zu behaupten.",
        ],
      },
    ],
    tips: [
      "Über „Neues Projekt“ startest du ein Vorhaben; die Statusanzeige zeigt, an welchem Gate es steht.",
      "Die Projektliste lässt sich durchsuchen, nach Status filtern und nach Datum/Titel sortieren; jede Karte zeigt das Erstell- und Änderungsdatum.",
    ],
  },
  new: {
    marker: "Schritt 1",
    title: "Vorhaben beschreiben",
    summary:
      "Du legst das Projekt an und beschreibst in eigenen Worten, was entstehen soll.",
    sections: [
      {
        heading: "Was hier gebraucht wird",
        body: [
          "Ein aussagekräftiger Titel und eine kurze Beschreibung des Vorhabens. Beides ist der Rohstoff für das anschließende Interview.",
          "Du musst hier noch nichts festlegen — Projekt-Natur und Zielplattform schärft die KI mit dir im nächsten Schritt.",
        ],
      },
    ],
    tips: [
      "Lieber konkret als vollständig: Ein klarer erster Satz zum Ziel bringt mehr als eine lange, vage Liste.",
    ],
  },
  interview: {
    marker: "Schritt 2",
    title: "Schärfungs-Interview",
    summary:
      "Im Dialog schärft die KI dein Vorhaben und schlägt Projekt-Natur und Zielplattform vor.",
    sections: [
      {
        heading: "Wie das Interview läuft",
        body: [
          "Die KI stellt Rückfragen und leitet aus deinen Antworten Vorschläge ab (Projekt-Natur, Zielplattform, Verständnis-Zusammenfassung).",
          "Vorschläge sind Angebote — du übernimmst, was passt, und korrigierst den Rest.",
        ],
      },
      {
        heading: "Schritt 2a — Zusätzlichen Kontext einspeisen",
        body: [
          "Du kannst Dokumente hochladen (.docx, .md, .pdf, .txt, .pptx, .xlsx; Fließtext und Tabellen), damit die Schärfung auf deinem Material aufsetzt.",
          "Wichtig zum Datenschutz: Der Inhalt wird nur ephemer für die Schärfung verarbeitet und danach verworfen. Dauerhaft gespeichert wird ausschließlich der Nachweis (Dateiname, Format, Größe, SHA-256-Prüfsumme, Token-Schätzung, wer/wann) — nicht der Text selbst.",
          "Grenzen: max. 25 MB pro Datei, max. 20 Dokumente pro Projekt, Gesamt-Budget ca. 150.000 Token.",
        ],
      },
    ],
    tips: [
      "Quellen lassen sich bis Gate 1 frei hinzufügen und entfernen — danach sind sie eingefroren.",
      "Je relevanter das hochgeladene Material, desto treffsicherer die Vorschläge der KI.",
    ],
  },
  understanding: {
    marker: "Schritt 3",
    title: "Verständnis & Gate 1",
    summary:
      "Du fixierst das gemeinsame Verständnis und gibst es frei — die erste menschliche Abnahme.",
    sections: [
      {
        heading: "Was du festlegst",
        body: [
          "Projektart (IT / Non-IT) und Unterart, Projekt-Natur (konzeptionell, technisch oder hybrid), Zielplattform und eine prägnante Verständnis-Zusammenfassung.",
          "Diese Angaben steuern u. a., welche Agentenrollen und Skills im späteren Harness vorgeschlagen werden — sie sind die Grundlage der gesamten Planung.",
        ],
      },
      {
        id: "preferences",
        heading: "AEGIRA-intern? & Preferences (Drift-Schutz)",
        body: [
          "Du wählst, ob es sich um ein AEGIRA-internes Projekt handelt. Bei „Nein“ (Kunden-/Externprojekt) werden auf keinen Fall AEGIRA-Preferences angewandt: keine Produktnamen (AI Navigator/Guardian/Commander), keine Constitution-Leitplanken, kein Zone-2-Schutz — der generierte Harness bleibt neutral.",
          "Bei „Ja“ wirst du zusätzlich gefragt, ob die Preferences/Constitution überhaupt angewandt werden sollen — auch interne Projekte dürfen bewusst opt-out wählen.",
          "Effektiv gilt: Preferences greifen nur, wenn AEGIRA-intern UND Preferences = Ja. Das schützt Kunden-Deliverables zuverlässig vor Preference-Drift.",
        ],
      },
      GATES.gate1.sections[0],
    ],
    tips: [
      "Im Zweifel „extern“ wählen — der sichere Default liefert einen markenneutralen Harness.",
      "Prüfe die Kontext-Quellen ein letztes Mal — mit der Freigabe werden sie eingefroren.",
      ...GATES.gate1.tips,
    ],
  },
  guardrails: {
    marker: "Schritt 5",
    title: "Leitplanken",
    summary:
      "Die KI prüft das Vorhaben gegen Leitplanken und gibt ein Urteil (erlaubt / eskalieren / abgelehnt).",
    sections: [
      {
        heading: "Was geprüft wird",
        body: [
          "Das Vorhaben wird gegen definierte Kategorien geprüft. Treffer erscheinen als Flags mit Schweregrad (hart/weich) und Begründung.",
          "Das Urteil ist transparent begründet — du siehst, warum erlaubt, eskaliert oder abgelehnt wurde.",
        ],
      },
      {
        heading: "Wenn eskaliert wird",
        body: [
          "Bei weichen Flags kannst du mit einer bewussten Entscheidung (mit Notiz) fortfahren. Harte Flags erfordern eine echte Klärung, bevor es weitergeht.",
        ],
      },
    ],
    tips: [
      "Die Begründung gehört zur Evidenz — eine Notiz beim Fortfahren macht die Entscheidung später nachvollziehbar.",
    ],
  },
  plan: {
    marker: "Schritt 6",
    title: "Plan",
    summary:
      "Aus deinem freigegebenen Verständnis erzeugt die KI einen strukturierten Plan.",
    sections: [
      {
        heading: "Was der Plan enthält",
        body: [
          "Phasen, Streams, Meilensteine (als Ziel-Zustände — keine Aktivitäten/Personentage; die konkrete Arbeit übernehmen später die Agenten), Risiken (Projekt- und Meilenstein-Ebene mit Ampel) und Verantwortlichkeiten (PVM-Codes).",
          "Dazu Reviewer-Befunde, ein Token-Budget und den Quellen-Nachweis (welche eingefrorenen Kontext-Quellen als Evidenz einfließen).",
        ],
      },
      {
        heading: "Methodik",
        body: [
          "Der Plan folgt einer strukturierten Methodik plus McKinsey-Prinzipien (MECE, Pyramid, hypothesengetrieben).",
          "Die Generierung ist deterministisch und nachvollziehbar — gleicher Input, gleicher plan_hash.",
        ],
      },
    ],
    tips: [
      "Der Quellen-Nachweis zeigt, dass der Plan auf deinem Material fußt — ohne den Inhalt zu speichern.",
      "Reviewer-Befunde zeigen, wo der Plan noch nachgeschärft werden sollte.",
    ],
  },
  review: {
    marker: "Schritt 7",
    title: "Review & Gate 2",
    summary:
      "Du prüfst und editierst den Plan und gibst die Version frei, die gebaut werden soll.",
    sections: [
      {
        heading: "Was du tust",
        body: [
          "Plan inline anpassen, Reviewer-Befunde abarbeiten und die freigabereife Version bestätigen.",
          "Jede Freigabe erzeugt eine neue, unveränderliche Version mit eigenem plan_hash.",
        ],
      },
      GATES.gate2.sections[1],
    ],
    tips: [...GATES.gate2.tips],
  },
  harness: {
    marker: "Schritt 8",
    title: "Agent-Harness",
    summary:
      "Aus dem freigegebenen Plan wird ein editierbares Agententeam kompiliert — Orchestrator, Worker, Reviewer und HITL-Checkpoints, exportierbar als portables ZIP.",
    sections: [
      {
        heading: "Was hier entsteht",
        body: [
          "Der Harness übersetzt den bei Gate 2 freigegebenen Plan deterministisch in eine ausführbare Agent-Konfiguration (Agenten, Orchestrierung, Skills, Hooks, Guardrails).",
          "Grundlage ist ausschließlich der freigegebene Plan-Stand. Du kannst den Harness mehrfach revidieren; jede Revision zählt die Iteration hoch (kein Endlos-Loop).",
        ],
      },
      {
        id: "autonomie-reifegrad",
        heading: "Autonomie-/Reifegrad-Stufe",
        body: [
          "Die Stufe 1–4 koppelt gebündelt den Permission-Modus, die HITL-Dichte und die Telemetrie des exportierten Harness — Autonomie wird an Reversibilität festgemacht, nicht an Pipeline-Mechanik.",
          "Stufe 1 Beaufsichtigt (Plan/Approvals) · 2 Assistiert (Edits/Bash fragen, Standard) · 3 Delegiert (Auto-Edits, riskante Tools fragen) · 4 Autonom (+Telemetrie). Irreversible/Hochrisiko-Aktionen bleiben auf JEDER Stufe HITL-pflichtig; bewusst keine 100%-Autonomie.",
          "Die Stufe schreibt `permissions.defaultMode` in die exportierte settings.json (plan/default/acceptEdits/dontAsk).",
        ],
      },
      {
        id: "orchestrierung-flow",
        heading: "Orchestrierung & Flow-Ansicht",
        body: [
          "Links ordnest du die Agenten per Drag&Drop in Stages (gleiche Stage = parallel, Reihenfolge = sequenziell); Modus Manager (ein Orchestrator delegiert) oder Handoff (Router/Triage übergibt).",
          "Rechts visualisiert die Flow-Ansicht die Abläufe und Zusammenhänge als Graph (Knoten = Agenten, Kanten = Abhängigkeiten). Sie spiegelt jede Drag&Drop-Änderung live.",
          "Im finalen (kompilierten) Zustand laufen dynamische Flows: animierte Partikel entlang der Kanten machen die Laufzeit-Dynamik sichtbar (Orchestrator → Worker → Reviewer → HITL).",
        ],
      },
      {
        id: "skills",
        heading: "Skills zuordnen (kuratiert)",
        body: [
          "Jeder Agent ist mit passenden, vom Admin freigegebenen Skills vorbelegt (Vorschlag). Du als HITL entscheidest: behalten, weitere zuordnen oder entfernen — Skills erscheinen als Tags.",
          "Trust-Tier ist eine Einstufung, keine Garantie. Neue oder gesperrte Skills verwaltet der Adminbereich (globale Freigabeliste). Die Auswahl landet auditierbar im Harness-ZIP (.claude/skills/_manifest.json).",
        ],
      },
      {
        id: "architektur-check",
        heading: "Architektur-Check (Preflight)",
        body: [
          "Eine read-only-Validierung prüft die Agenten-Topologie gegen Best-Practice-Anti-Muster (vage Delegation, Über-Spawning, fehlender Checkpoint, fehlender Evaluator). Befunde mit Schweregrad „fail“ blockieren die Gate-3-Freigabe.",
        ],
      },
      {
        id: "drucken",
        heading: "Projekt drucken",
        body: [
          "Über „Projekt drucken“ öffnest du einen druckoptimierten Gesamt-Report (Plan, Meilensteine, Risiken, Agenten + Skills, HITL-Punkte und das Skill-Manifest) und speicherst ihn als PDF.",
        ],
      },
    ],
    tips: [
      "Wenn sich der PLAN ändern soll, gehört das vor diesen Schritt — über Review & Gate 2. Hier wird der Plan umgesetzt, nicht neu erfunden.",
      "Niedrige Autonomie-Stufe für sensible Vorhaben; hohe Stufe nur, wenn HITL-Checkpoints + Hooks die irreversiblen Punkte absichern.",
      "Die Flow-Ansicht eignet sich gut zum Erklären/Präsentieren des Agententeams.",
    ],
  },
  export: {
    marker: "Schritt 9",
    title: "Export & Gate 3",
    summary:
      "Du gibst den Harness für den Export frei — der Abschluss des Vorhabens.",
    sections: [GATES.gate3.sections[0]],
    tips: [...GATES.gate3.tips],
  },
};

/** Reihenfolge für die /guide-Gesamtübersicht. */
export const HELP_ORDER: HelpTopic[] = [
  "overview",
  "new",
  "interview",
  "understanding",
  "guardrails",
  "plan",
  "review",
  "harness",
  "export",
];
