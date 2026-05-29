/**
 * Schritt 2 — Schärfungs-Interview (McKinsey).
 *
 * Spec: docs/09_process-flow.md (Schritt 2). Eine Frage nach der anderen,
 * hypothesengeleitete Vorschläge als Chips (annehmbar / verwerfbar). Übernehmen
 * setzt das Feld via PATCH /understanding. Editieren erfolgt in Schritt 3.
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../components/PageShell";
import { Button, cardStyle, inputStyle } from "../../../../components/ui";
import {
  api,
  ApiError,
  type InterviewMessage,
  type Suggestion,
} from "../../../../lib/api";

export default function Interview(): React.ReactElement {
  const router = useRouter();
  const id = useParams<{ id: string }>().id;

  const [messages, setMessages] = React.useState<InterviewMessage[]>([]);
  const [live, setLive] = React.useState("");
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState<Record<string, "ok" | "off">>({});
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    api
      .getInterview(id)
      .then((s) => {
        setMessages(s.transcript);
        setDone(s.done);
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Interview nicht ladbar."),
      );
  }, [id]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, live]);

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text, suggestions: [] }]);
    setLive("");
    try {
      const res = await api.streamInterviewTurn(id, text, (chunk) =>
        setLive((prev) => prev + chunk),
      );
      setMessages((m) => [...m, res.message]);
      setLive("");
      setDone(res.done);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Senden fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function accept(s: Suggestion): Promise<void> {
    try {
      await api.updateUnderstanding(id, { [s.kind]: s.value });
      setAccepted((a) => ({ ...a, [s.id]: "ok" }));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Übernehmen fehlgeschlagen.");
    }
  }

  return (
    <PageShell subtitle="Interview · Schritt 2">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>Schärfungs-Interview</h1>
      <p style={leadStyle}>
        Beantworte die Fragen einzeln. Vorschläge erscheinen als Chips — übernimm
        oder verwirf sie. Editieren kannst du alles in Schritt 3.
      </p>

      <div style={chatStyle}>
        {messages.map((m, i) => (
          <div key={i} style={m.role === "user" ? userRowStyle : asstRowStyle}>
            <div style={m.role === "user" ? userBubble : asstBubble}>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              {m.suggestions.length > 0 ? (
                <div style={chipWrapStyle}>
                  {m.suggestions.map((s) => {
                    const state = accepted[s.id];
                    return (
                      <div key={s.id} style={chipStyle} title={s.rationale}>
                        <span style={chipLabelStyle}>{s.label}</span>
                        {state === "ok" ? (
                          <span style={chipOkStyle}>übernommen ✓</span>
                        ) : state === "off" ? (
                          <span style={chipOffStyle}>verworfen</span>
                        ) : (
                          <>
                            <button style={chipBtn} onClick={() => accept(s)}>
                              Übernehmen
                            </button>
                            <button
                              style={chipBtnGhost}
                              onClick={() =>
                                setAccepted((a) => ({ ...a, [s.id]: "off" }))
                              }
                            >
                              Verwerfen
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {live ? (
          <div style={asstRowStyle}>
            <div style={asstBubble}>
              <div style={{ whiteSpace: "pre-wrap" }}>{live}</div>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {done ? (
        <div style={doneRowStyle}>
          <span style={{ color: "var(--c-text-muted)", fontSize: 13 }}>
            Verständnis steht. Weiter zur Freigabe.
          </span>
          <Button
            variant="accent"
            onClick={() => router.push(`/projects/${id}/understanding`)}
          >
            Weiter zu Verständnis & Gate 1
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          style={composerStyle}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Deine Antwort…"
            style={{ ...inputStyle, flex: 1 }}
            disabled={busy}
            aria-label="Antwort"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            {busy ? "…" : "Senden"}
          </Button>
        </form>
      )}
    </PageShell>
  );
}

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-6)",
  lineHeight: 1.6,
};

const chatStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-3)",
  maxHeight: "55vh",
  overflowY: "auto",
  padding: "var(--sp-2)",
  marginBottom: "var(--sp-4)",
};

const asstRowStyle: React.CSSProperties = { display: "flex", justifyContent: "flex-start" };
const userRowStyle: React.CSSProperties = { display: "flex", justifyContent: "flex-end" };

const asstBubble: React.CSSProperties = {
  ...cardStyle,
  maxWidth: "80%",
  borderColor: "var(--c-border)",
};

const userBubble: React.CSSProperties = {
  maxWidth: "80%",
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "var(--c-navy)",
  color: "var(--c-vellum)",
  borderRadius: "var(--r-md)",
};

const chipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--sp-2)",
  marginTop: "var(--sp-3)",
  paddingTop: "var(--sp-3)",
  borderTop: "1px solid var(--c-border)",
};

const chipStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  padding: "var(--sp-1) var(--sp-2)",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-pill)",
  fontSize: "var(--fs-caption)",
};

const chipLabelStyle: React.CSSProperties = { fontWeight: 600 };

const chipBtn: React.CSSProperties = {
  border: 0,
  background: "var(--c-gold)",
  color: "var(--c-navy-dark)",
  borderRadius: "var(--r-pill)",
  padding: "2px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const chipBtnGhost: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--c-steel)",
  padding: "2px 6px",
  fontSize: 12,
  cursor: "pointer",
};

const chipOkStyle: React.CSSProperties = { color: "var(--c-green)", fontWeight: 600 };
const chipOffStyle: React.CSSProperties = { color: "var(--c-gray)" };

const composerStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--sp-2)",
};

const doneRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-4)",
  flexWrap: "wrap",
};

const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(195, 66, 63, 0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  marginBottom: "var(--sp-4)",
};
