/**
 * Inhalt der In-App-Hilfe. Eine einzige Quelle für den Hilfe-Drawer (pro Seite)
 * und die /guide-Seite (Gesamtübersicht). Bewusst als Daten gehalten, damit
 * beide Oberflächen denselben Text rendern und der User-Guide konsistent bleibt.
 *
 * Sprache: Deutsch (Nutzeroberfläche). Begriffe folgen der Constitution:
 * Trust-Infrastructure, AIMS, Rechtsräume DE/EU27-Rest/UK/CH, ZGPM-Methodik.
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
      "Du prüfst und editierst den ZGPM-Plan und gibst die Version frei, die gebaut werden soll.",
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
          "PLANEN — Kontext verwalten, Leitplanken prüfen, ZGPM-Plan erzeugen, Plan freigeben (Gate 2).",
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
          "Projekt-Natur (konzeptionell, technisch oder hybrid), Zielplattform und eine prägnante Verständnis-Zusammenfassung.",
          "Diese drei Angaben sind die Grundlage für die gesamte spätere Planung.",
        ],
      },
      GATES.gate1.sections[0],
    ],
    tips: [
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
    title: "ZGPM-Plan",
    summary:
      "Aus deinem freigegebenen Verständnis erzeugt die KI einen strukturierten Plan nach ZGPM-Methodik.",
    sections: [
      {
        heading: "Was der Plan enthält",
        body: [
          "Phasen, Streams, Meilensteine mit Aktivitäten, Risiken (Projekt- und Meilenstein-Ebene mit Ampel) und Verantwortlichkeiten (PVM-Codes).",
          "Dazu Reviewer-Befunde, ein Token-Budget und den Quellen-Nachweis (welche eingefrorenen Kontext-Quellen als Evidenz einfließen).",
        ],
      },
      {
        heading: "Methodik",
        body: [
          "Der Plan folgt der ZGPM-Methodik (methodisch genutzt) plus McKinsey-Prinzipien (MECE, Pyramid, hypothesengetrieben).",
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
      "Aus dem freigegebenen Plan wird der ausführbare Agent-Harness kompiliert.",
    sections: [
      {
        heading: "Was hier entsteht",
        body: [
          "Der Harness übersetzt den freigegebenen Plan in eine ausführbare Agent-Konfiguration.",
          "Grundlage ist ausschließlich der bei Gate 2 freigegebene Plan-Stand.",
        ],
      },
    ],
    tips: [
      "Wenn sich der Plan ändern soll, gehört das vor diesen Schritt — über Review & Gate 2.",
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
