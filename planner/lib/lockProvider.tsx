/**
 * LockProvider — entscheidet, WANN gesperrt wird, und hält die Session.
 * Spec: LockScreen.tsx, docs/06_azure-configuration-guide.md §14.
 *
 * Verhalten:
 *  - Die App ist beim Laden **gesperrt** und wird erst durch Anmeldung
 *    (E-Mail + Passwort + TOTP-2FA, serverseitig in /v1/auth geprüft) geöffnet.
 *    Ein gültiges Session-Token in sessionStorage hält die App über Reloads
 *    hinweg offen (bis Ablauf oder Idle); ein neuer Tab/Neustart sperrt wieder.
 *  - Idle: nach Inaktivität wird gesperrt und das Token verworfen — Wiedereintritt
 *    nur über erneute Anmeldung. Die Idle-Erkennung prüft die **verstrichene
 *    Wall-Clock-Zeit** (Intervall + visibilitychange/focus) statt eines einzelnen
 *    langen Timers (der im Hintergrund/Schlaf gedrosselt wird → sperrt sonst nie).
 *
 * Idle-Dauer aus `NEXT_PUBLIC_LOCK_IDLE_SEC` (Default 900 s). ⚠️ NEXT_PUBLIC_* wird
 * zur **Build-Zeit** eingebacken (Docker-`--build-arg`), nicht zur Laufzeit.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LockScreen } from "../components/LockScreen";
import { api } from "./api";

// Deploy-Marker: NEXT_PUBLIC_APP_VERSION wird zur Build-Zeit als String-Literal in
// diesen (route-stabilen) Client-Chunk gebacken und unten verborgen gerendert. Der
// Post-Deploy-Check greift den ausgelieferten Inhalt direkt an der
// *.azurecontainerapps.io-FQDN ab und prüft auf genau diesen Tag → erkennt einen
// veralteten Frontend-Build, den /health der API nicht sieht.
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

const IDLE_SEC = Number(process.env.NEXT_PUBLIC_LOCK_IDLE_SEC ?? "900");
const IDLE_MS = IDLE_SEC * 1000;
const CHECK_MS = Math.max(1000, Math.min(IDLE_MS || 15000, 15000));
const SESSION_KEY = "aegira.session";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

interface StoredSession {
  token: string;
  exp: number; // Unix-Sekunden
}

function readSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s.token || typeof s.exp !== "number") return null;
    if (s.exp * 1000 <= Date.now()) return null; // abgelaufen
    return s;
  } catch {
    return null;
  }
}

export function LockProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // Beim Laden gesperrt; ein Effekt entsperrt, wenn ein gültiges Token existiert.
  const [locked, setLocked] = React.useState(true);
  const [lockedAt, setLockedAt] = React.useState<Date>(() => new Date());
  const [isAdmin, setIsAdmin] = React.useState(false);
  const lastActivity = React.useRef<number>(Date.now());

  // Öffentliche Auth-Seiten (z. B. Magic-Link-Ziel /auth/verify) sind NICHT gesperrt
  // — sonst könnte niemand seine E-Mail bestätigen.
  const pathname = usePathname();
  const bypass = !!pathname && pathname.startsWith("/auth");
  const router = useRouter();

  // MFA → Explainer → Planner. `force` = nach echtem Login (onUnlocked): IMMER zum
  // Explainer — auch wenn in dieser Tab-Session schon gesehen (Wunsch: nach jedem MFA).
  // Ohne `force` (Reload mit gültiger Session): nur wenn noch nicht „gesehen", damit ein
  // Reload im Planner nicht zurück auf den Explainer bounct.
  const onboardAfterUnlock = React.useCallback((force?: boolean) => {
    try {
      const seen = window.sessionStorage.getItem("aegira.explainer.seen") === "1";
      if (
        (force || !seen) &&
        pathname !== "/explainer" &&
        !(pathname ?? "").startsWith("/auth")
      ) {
        router.replace("/explainer");
      }
    } catch {
      /* Storage nicht verfügbar → Planner direkt */
    }
  }, [pathname, router]);

  const lock = React.useCallback(() => {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      // Onboarding ist pro MFA-Session: beim Sperren zurücksetzen → nach Re-Login
      // (z. B. nach Idle-Lock) erscheint der Explainer erneut.
      window.sessionStorage.removeItem("aegira.explainer.seen");
    } catch {
      /* sessionStorage nicht verfügbar */
    }
    setIsAdmin(false);
    setLockedAt(new Date());
    setLocked(true);
  }, []);

  // Mount: vorhandenes Session-Token serverseitig prüfen → ggf. entsperrt starten.
  React.useEffect(() => {
    const stored = readSession();
    if (!stored) return; // bleibt gesperrt
    let alive = true;
    api
      .authSession(stored.token)
      .then((res) => {
        if (alive && res.valid) {
          lastActivity.current = Date.now();
          setIsAdmin(res.is_admin);
          setLocked(false);
          onboardAfterUnlock();
        } else {
          window.sessionStorage.removeItem(SESSION_KEY);
        }
      })
      .catch(() => {
        /* Backend nicht erreichbar → sicherheitshalber gesperrt bleiben */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Idle-Erkennung über verstrichene Zeit (nur solange entsperrt; nicht auf /auth/*).
  React.useEffect(() => {
    if (locked || bypass || IDLE_SEC <= 0) return;
    lastActivity.current = Date.now();

    const check = (): void => {
      if (Date.now() - lastActivity.current >= IDLE_MS) lock();
    };
    const onActivity = (): void => {
      lastActivity.current = Date.now();
    };
    const onVisible = (): void => {
      if (document.visibilityState === "visible") check();
    };

    for (const ev of ACTIVITY_EVENTS)
      window.addEventListener(ev, onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const interval = window.setInterval(check, CHECK_MS);

    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(interval);
    };
  }, [locked, bypass, lock]);

  const onUnlocked = React.useCallback(
    (token: string, expiresAt: number, admin: boolean) => {
      try {
        window.sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ token, exp: expiresAt } satisfies StoredSession),
        );
      } catch {
        /* sessionStorage nicht verfügbar — Sitzung gilt nur für diesen Tab-Lebenszyklus */
      }
      lastActivity.current = Date.now();
      setIsAdmin(admin);
      setLocked(false);
      onboardAfterUnlock(true); // echter Login → immer Explainer
    },
    [onboardAfterUnlock],
  );

  return (
    <>
      {children}
      {/* Verborgener Deploy-Marker (keine UI-Wirkung) — landet im SSR-HTML jeder
          Route UND im Client-Chunk; vom Post-Deploy-Inhalts-Grep ausgewertet. */}
      <span data-aomp-version={APP_VERSION} aria-hidden="true" style={{ display: "none" }} />
      {!locked && !bypass && isAdmin ? (
        <Link href="/admin" className="aegira-no-print" style={adminLinkStyle}>
          ⚙ Adminbereich
        </Link>
      ) : null}
      <LockScreen isLocked={locked && !bypass} lockedAt={lockedAt} onUnlocked={onUnlocked} />
    </>
  );
}

const adminLinkStyle: React.CSSProperties = {
  position: "fixed",
  right: 12,
  bottom: 12,
  zIndex: 5000,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--c-vellum)",
  backgroundColor: "var(--c-navy)",
  borderRadius: "var(--r-pill)",
  textDecoration: "none",
  boxShadow: "var(--sh-1)",
};
