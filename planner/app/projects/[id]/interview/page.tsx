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
  type ContextSource,
  type InterviewMessage,
  type Suggestion,
} from "../../../../lib/api";

const ACCEPT = ".docx,.md,.pdf,.txt,.pptx,.xlsx,.png,.jpg,.jpeg,.gif,.webp";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

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
  const [sources, setSources] = React.useState<ContextSource[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [folderNote, setFolderNote] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const folderRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  // `webkitdirectory` ist kein Standard-JSX-Attribut → per Ref setzen (cross-browser:
  // Chrome/Edge/Firefox/Safari erlauben so das Einlesen eines ganzen lokalen Ordners).
  React.useEffect(() => {
    const el = folderRef.current;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }, []);

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
    api
      .listContext(id)
      .then(setSources)
      .catch(() => {
        /* Kontext ist optional — Fehler still */
      });
  }, [id]);

  async function onUpload(files: FileList | null): Promise<void> {
    if (!files || files.length === 0 || uploading) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const src = await api.uploadContext(id, file);
        setSources((s) => [...s, src]);
      }
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Feature A — eine ganze lokale Ordnerstruktur einlesen (ohne Dropbox). Nutzt
  // denselben ephemeren Upload-Pfad; nicht unterstützte Dateien werden still
  // übersprungen, die 20-Dokumente-Grenze gilt. Spec: docs/10.
  async function onUploadFolder(files: FileList | null): Promise<void> {
    if (!files || files.length === 0 || uploading) return;
    setUploading(true);
    setError(null);
    setFolderNote("Lese Ordner…");
    const exts = ACCEPT.split(",");
    const supported = Array.from(files).filter((f) =>
      exts.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    let added = 0;
    let skipped = files.length - supported.length;
    try {
      for (const file of supported) {
        if (sources.length + added >= 20) {
          skipped += 1;
          continue;
        }
        try {
          const src = await api.uploadContext(id, file);
          setSources((s) => [...s, src]);
          added += 1;
        } catch {
          skipped += 1; // einzelne defekte/zu große Datei still überspringen
        }
      }
      setFolderNote(
        `${added} Datei(en) aus Ordner eingelesen` +
          (skipped ? `, ${skipped} übersprungen` : "") +
          " ✓",
      );
    } finally {
      setUploading(false);
      if (folderRef.current) folderRef.current.value = "";
    }
  }

  async function removeSource(sourceId: string): Promise<void> {
    setError(null);
    try {
      await api.deleteContext(id, sourceId);
      setSources((s) => s.filter((x) => x.id !== sourceId));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Entfernen fehlgeschlagen.");
    }
  }

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
    <PageShell subtitle="Interview · Schritt 2" helpTopic="interview">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>Schärfungs-Interview</h1>
      <p style={leadStyle}>
        Beantworte die Fragen einzeln. Vorschläge erscheinen als Chips — übernimm
        oder verwirf sie. Editieren kannst du alles in Schritt 3.
      </p>

      <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
        <div style={ctxHeadStyle}>
          <span style={sectionLabel}>Kontext-Quellen (optional)</span>
          {!done ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                multiple
                style={{ display: "none" }}
                onChange={(e) => void onUpload(e.target.files)}
              />
              <input
                ref={folderRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => void onUploadFolder(e.target.files)}
              />
              <button
                type="button"
                style={ctxAddBtn}
                disabled={uploading || sources.length >= 20}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Lädt…" : "+ Datei hinzufügen"}
              </button>
              <button
                type="button"
                style={ctxAddBtn}
                disabled={uploading || sources.length >= 20}
                onClick={() => folderRef.current?.click()}
                title="Eine ganze lokale Ordnerstruktur einlesen (ohne Dropbox)"
              >
                + Lokaler Ordner
              </button>
            </>
          ) : (
            <span style={ctxFrozenStyle}>eingefroren (Gate 1) ✓</span>
          )}
        </div>
        <p style={ctxHintStyle}>
          .docx · .md · .pdf · .txt · .pptx · .xlsx · <strong>Bilder</strong> (.png ·
          .jpg · .gif · .webp) · max. 25 MB, bis 20 Dateien. Inhalt wird nur zur
          Schärfung verarbeitet und danach verworfen; als Nachweis bleibt nur die
          Quelle (Name + Hash), bei Gate 1 eingefroren. Quellen: Einzeldateien oder
          ein ganzer <strong>lokaler Ordner</strong> (ohne Cloud, alle Browser).
        </p>
        {folderNote ? <p style={ctxHintStyle}>{folderNote}</p> : null}
        {sources.length > 0 ? (
          <ul style={ctxListStyle}>
            {sources.map((s) => (
              <li key={s.id} style={ctxItemStyle}>
                <span style={ctxFmtBadge}>{s.fmt}</span>
                <span style={ctxNameStyle}>{s.filename}</span>
                <span style={ctxMetaStyle}>
                  {fmtBytes(s.size_bytes)} · ~{s.token_estimate.toLocaleString("de-DE")} Tok.
                </span>
                {!done ? (
                  <button
                    type="button"
                    style={ctxRemoveBtn}
                    onClick={() => void removeSource(s.id)}
                    aria-label={`${s.filename} entfernen`}
                  >
                    ✕
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={ctxEmptyStyle}>Noch keine Quellen hinzugefügt.</p>
        )}
      </div>

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
            Planung beendet (DONE). Du bestimmst — weiter zur Freigabe oder weiterplanen.
          </span>
          <span style={{ display: "flex", gap: "var(--sp-2)" }}>
            <Button variant="secondary" onClick={() => setDone(false)}>
              Weiterplanen
            </Button>
            <Button
              variant="accent"
              onClick={() => router.push(`/projects/${id}/understanding`)}
            >
              Weiter zu Verständnis & Gate 1
            </Button>
          </span>
        </div>
      ) : (
        <>
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
          {/* v0.4 — der Anwender bestimmt DONE, nicht die Engine. */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--sp-2)" }}>
            <Button variant="secondary" onClick={() => setDone(true)} disabled={busy}>
              Planung beenden (DONE)
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-6)",
  lineHeight: 1.6,
};

const sectionLabel: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
};

const ctxHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-2)",
  marginBottom: "var(--sp-2)",
};

const ctxAddBtn: React.CSSProperties = {
  border: "1px solid var(--c-border-strong)",
  background: "transparent",
  color: "var(--c-navy)",
  borderRadius: "var(--r-pill)",
  padding: "4px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const ctxFrozenStyle: React.CSSProperties = {
  color: "var(--c-green)",
  fontWeight: 600,
  fontSize: 13,
};

const ctxHintStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  fontSize: 12,
  lineHeight: 1.5,
  marginBottom: "var(--sp-3)",
};

const ctxListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-2)",
};

const ctxItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  fontSize: 13,
};

const ctxFmtBadge: React.CSSProperties = {
  flexShrink: 0,
  padding: "1px 8px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-pill)",
  color: "var(--c-steel)",
};

const ctxNameStyle: React.CSSProperties = {
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const ctxMetaStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginLeft: "auto",
  whiteSpace: "nowrap",
};

const ctxRemoveBtn: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--c-steel)",
  cursor: "pointer",
  fontSize: 14,
  padding: "0 4px",
};

const ctxEmptyStyle: React.CSSProperties = {
  color: "var(--c-gray)",
  fontSize: 13,
  margin: 0,
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
