/**
 * Schritt 5 — Leitplanken (Front-loaded Discovery, PLANEN).
 *
 * Spec: docs/09_process-flow.md (Schritt 5). Zeigt den erlaubten Rahmen und das
 * Prüf-Ergebnis. Harte Verbote blockieren; Grenzfälle werden an den Anwender
 * eskaliert (bewusste Bestätigung), nie still entschieden. Erst nach Gate 1.
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../components/PageShell";
import { Button, cardStyle } from "../../../../components/ui";
import { api, ApiError, type GuardrailCheck } from "../../../../lib/api";

const NATURE_LABEL: Record<string, string> = {
  concept: "Konzept (Methodik & Dokumente)",
  technical: "Technisch (Architektur & Code)",
  "hybrid-concept-tech": "Hybrid (beides)",
};

export default function Guardrails(): React.ReactElement {
  const router = useRouter();
  const id = useParams<{ id: string }>().id;

  const [check, setCheck] = React.useState<GuardrailCheck | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [cleared, setCleared] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .getGuardrails(id)
      .then((c) => {
        setCheck(c);
        setCleared(c.cleared_at != null);
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Leitplanken nicht ladbar."),
      );
  }, [id]);

  async function clear(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api.clearGuardrails(id, true);
      setCleared(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Quittieren fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (check === null) {
    return (
      <PageShell subtitle="Leitplanken · Schritt 5" helpTopic="guardrails">
        {error ? <p style={errorStyle}>{error}</p> : <p>Lade…</p>}
      </PageShell>
    );
  }

  const { verdict } = check;
  const canProceed =
    !cleared && (verdict === "allowed" || (verdict === "escalate" && confirmed));

  return (
    <PageShell subtitle="Leitplanken · Schritt 5" helpTopic="guardrails">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>Leitplanken</h1>
      <p style={leadStyle}>
        Bevor geplant wird: der erlaubte Rahmen. Harte Verbote blockieren die
        Planung; Grenzfälle gehen zur Prüfung an dich — nichts wird still
        entschieden.
      </p>

      {cleared ? (
        <div style={banner("var(--c-green)", "rgba(90,147,103,0.10)")}>
          <strong>Leitplanken geprüft ✓</strong> Du kannst mit der Planung
          fortfahren. Der Plan (Schritt 6) folgt.
        </div>
      ) : verdict === "refused" ? (
        <div style={banner("var(--c-red)", "rgba(195,66,63,0.08)")}>
          <strong>Nicht planbar.</strong> {check.rationale}
        </div>
      ) : verdict === "escalate" ? (
        <div style={banner("var(--c-amber)", "rgba(232,163,58,0.10)")}>
          <strong>Bitte prüfen.</strong> {check.rationale}
        </div>
      ) : (
        <div style={banner("var(--c-green)", "rgba(90,147,103,0.10)")}>
          <strong>Frei für die Planung.</strong> {check.rationale}
        </div>
      )}

      {check.flags.length > 0 ? (
        <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
          <div style={sectionLabel}>Erkannte Treffer</div>
          <ul style={flagListStyle}>
            {check.flags.map((f) => (
              <li key={f.category_id} style={flagItemStyle}>
                <span
                  style={{
                    ...sevTagStyle,
                    color:
                      f.severity === "hard" ? "var(--c-red)" : "var(--c-amber)",
                    borderColor:
                      f.severity === "hard" ? "var(--c-red)" : "var(--c-amber)",
                  }}
                >
                  {f.severity === "hard" ? "Verbot" : "Grenzfall"}
                </span>
                <span>
                  <strong>{f.label}</strong>
                  <span style={termsStyle}> — {f.matched_terms.join(", ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={twoColStyle}>
        <div style={cardStyle}>
          <div style={sectionLabel}>Was geht — Projektart</div>
          <ul style={plainListStyle}>
            {check.allowed_natures.map((n) => (
              <li key={n} style={allowItemStyle}>
                {NATURE_LABEL[n] ?? n}
              </li>
            ))}
          </ul>
        </div>

        <div style={cardStyle}>
          <div style={sectionLabel}>Was das System verweigert</div>
          <ul style={plainListStyle}>
            {check.forbidden_categories.map((c) => (
              <li key={c.id} style={forbidItemStyle} title={c.description}>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {verdict === "escalate" && !cleared ? (
        <label style={confirmRowStyle}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            Ich bestätige, dass das Vorhaben keinen verbotenen Zweck verfolgt.
          </span>
        </label>
      ) : null}

      {error ? <p style={errorStyle}>{error}</p> : null}

      <div style={actionsStyle}>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Zur Übersicht
        </Button>
        {cleared ? (
          <Button
            variant="accent"
            data-testid="guardrails-next"
            onClick={() => router.push(`/projects/${id}/plan/milestones`)}
          >
            Weiter zum Plan
          </Button>
        ) : verdict !== "refused" ? (
          <Button variant="accent" data-testid="guardrails-clear" onClick={clear} disabled={!canProceed || busy}>
            {busy ? "…" : "Weiter zur Planung"}
          </Button>
        ) : null}
      </div>
    </PageShell>
  );
}

function banner(color: string, bg: string): React.CSSProperties {
  return {
    padding: "var(--sp-3) var(--sp-4)",
    backgroundColor: bg,
    border: `1px solid ${color}`,
    borderRadius: "var(--r-md)",
    color,
    marginBottom: "var(--sp-4)",
    lineHeight: 1.5,
  };
}

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-6)",
  lineHeight: 1.6,
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--sp-3)",
  marginBottom: "var(--sp-4)",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-2)",
};

const plainListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-1)",
};

const allowItemStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--c-text)",
};

const forbidItemStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--c-steel)",
  cursor: "help",
};

const flagListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-2)",
};

const flagItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  fontSize: 14,
};

const sevTagStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: "1px var(--sp-2)",
  fontSize: 11,
  fontWeight: 600,
  border: "1px solid",
  borderRadius: "var(--r-pill)",
};

const termsStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  fontStyle: "italic",
};

const confirmRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  fontSize: 14,
  marginBottom: "var(--sp-4)",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--sp-2)",
};

const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(195, 66, 63, 0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  marginBottom: "var(--sp-4)",
};
