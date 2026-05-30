/**
 * LockProvider — entscheidet, WANN gesperrt wird (Spec: LockScreen.tsx Header,
 * docs/06_azure-configuration-guide.md §14).
 *
 * Verhalten:
 *  - Überwacht Nutzeraktivität (Maus, Tastatur, Touch, Scroll).
 *  - Nach Inaktivität (Idle-Timeout) wird die Sitzung gesperrt: blur-Overlay,
 *    kein Bypass. Während der Sperre setzt Aktivität den Timer NICHT zurück —
 *    entsperrt wird nur bewusst per Button (Human-in-the-Loop).
 *  - Nach dem Entsperren läuft der Timer neu; der letzte App-Stand bleibt erhalten
 *    (reines Overlay, kein Reset des darunterliegenden Zustands).
 *
 * Idle-Dauer aus `NEXT_PUBLIC_LOCK_IDLE_SEC` (Default 900 s = 15 min, analog
 * SESSION_IDLE_TIMEOUT_WORKSPACE_SEC). Auth ist im Spike gestubbt; die echte
 * SSO-/MFA-Entsperrung folgt mit Entra-ID (Phase-2-Beta).
 */

"use client";

import * as React from "react";
import { LockScreen } from "../components/LockScreen";

const IDLE_SEC = Number(process.env.NEXT_PUBLIC_LOCK_IDLE_SEC ?? "900");
// Stub-Identität bis Entra-ID-Auth steht (Phase-2-Beta).
const STUB_USER = process.env.NEXT_PUBLIC_USER_NAME ?? "AEGIRA Operator";
const STUB_EMAIL = process.env.NEXT_PUBLIC_USER_EMAIL ?? "operator@exmachinai.ai";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

export function LockProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [locked, setLocked] = React.useState(false);
  const [lockedAt, setLockedAt] = React.useState<Date | null>(null);
  const timer = React.useRef<number | null>(null);

  const clear = React.useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const arm = React.useCallback(() => {
    clear();
    if (IDLE_SEC <= 0) return; // 0/negativ → Sperre deaktiviert
    timer.current = window.setTimeout(() => {
      setLockedAt(new Date());
      setLocked(true);
    }, IDLE_SEC * 1000);
  }, [clear]);

  React.useEffect(() => {
    if (locked) {
      // Während der Sperre keine Aktivitäts-Resets — Entsperren nur per Button.
      clear();
      return;
    }
    arm();
    const onActivity = (): void => arm();
    for (const ev of ACTIVITY_EVENTS)
      window.addEventListener(ev, onActivity, { passive: true });
    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
      clear();
    };
  }, [locked, arm, clear]);

  const unlock = React.useCallback(() => {
    setLocked(false);
    setLockedAt(null);
  }, []);

  return (
    <>
      {children}
      <LockScreen
        isLocked={locked}
        userName={STUB_USER}
        userEmail={STUB_EMAIL}
        lockedAt={lockedAt ?? new Date()}
        unlockStrategy="quick"
        onUnlockClick={unlock}
        onSignOutClick={unlock}
      />
    </>
  );
}
