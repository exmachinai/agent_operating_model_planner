/**
 * LockScreen — Pflicht-Komponente.
 *
 * Spec: docs/06_azure-configuration-guide.md §14
 * Brand: BRAND.md (Navy + Vellum, Gold-Accent < 10%)
 *
 * Behavior:
 *   - Modal over the entire app, no bypass.
 *   - Background is the actual app, blurred (filter: blur(20px)).
 *   - SSE/WebSocket connections are paused by the parent during lock.
 *   - On unlock: parent restores state and re-opens connections.
 *
 * This component DOES NOT decide WHEN to lock. That's the LockProvider's job
 * (lib/lockProvider.tsx — to be implemented). This component just renders the
 * lock state and delegates unlock to the auth flow.
 *
 * Accessibility:
 *   - aria-modal=true.
 *   - Initial focus on the SSO unlock button.
 *   - Esc shows a hint but does NOT unlock.
 *   - Screen-reader announcement on lock and on unlock.
 */

"use client";

import * as React from "react";

export interface LockScreenProps {
  /** Displayed when locked. Must be true to render the overlay. */
  isLocked: boolean;
  /** Authenticated user's display name (e.g. "Michael Veil"). */
  userName: string;
  /** Authenticated user's email. */
  userEmail: string;
  /** Wall-clock time when the lock was activated. */
  lockedAt: Date;
  /**
   * Strategy for unlocking. The Lock-Screen chooses the UI label;
   * the actual flow is in lib/auth.
   */
  unlockStrategy: "quick" | "mfa" | "hard";
  /** Called when the user clicks the unlock button. */
  onUnlockClick: () => void | Promise<void>;
  /** Called when the user clicks "sign out / other person". */
  onSignOutClick: () => void | Promise<void>;
  /** Locale for the labels. Default 'de'. */
  locale?: "de" | "en";
}

const COPY: Record<
  "de" | "en",
  {
    brand: string;
    tagline: string;
    locked: string;
    loggedInAs: (n: string, e: string) => string;
    unlock: { quick: string; mfa: string; hard: string };
    other: string;
    signOut: string;
    lockedSinceLabel: string;
    restoreNote: string;
    escHint: string;
    a11yLockedAnnouncement: string;
  }
> = {
  de: {
    brand: "AEGIRA",
    tagline: "AI Trust Platform",
    locked: "Gesperrt",
    loggedInAs: (n, e) => `Du bist als ${n} eingeloggt (${e}).`,
    unlock: {
      quick: "Mit Single-Sign-On entsperren",
      mfa: "Mit MFA neu authentifizieren",
      hard: "Vollständig neu anmelden",
    },
    other: "Andere Person?",
    signOut: "Abmelden",
    lockedSinceLabel: "Gesperrt seit",
    restoreNote: "Letzter Stand wird wiederhergestellt nach Entsperren.",
    escHint: "Esc entsperrt die Sitzung nicht. Bitte mit SSO entsperren.",
    a11yLockedAnnouncement:
      "Sitzung gesperrt. Mit Single-Sign-On entsperren oder abmelden.",
  },
  en: {
    brand: "AEGIRA",
    tagline: "AI Trust Platform",
    locked: "Locked",
    loggedInAs: (n, e) => `Signed in as ${n} (${e}).`,
    unlock: {
      quick: "Unlock with Single-Sign-On",
      mfa: "Re-authenticate with MFA",
      hard: "Sign in again",
    },
    other: "Not you?",
    signOut: "Sign out",
    lockedSinceLabel: "Locked since",
    restoreNote: "Previous state will be restored after unlock.",
    escHint: "Esc does not unlock. Please use Single-Sign-On.",
    a11yLockedAnnouncement: "Session locked. Unlock with SSO or sign out.",
  },
};

function fmtClock(d: Date, locale: "de" | "en"): string {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function LockScreen(props: LockScreenProps): React.ReactElement | null {
  const {
    isLocked,
    userName,
    userEmail,
    lockedAt,
    unlockStrategy,
    onUnlockClick,
    onSignOutClick,
    locale = "de",
  } = props;

  const t = COPY[locale];
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [escHintVisible, setEscHintVisible] = React.useState(false);

  React.useEffect(() => {
    if (!isLocked) return;
    buttonRef.current?.focus();

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        setEscHintVisible(true);
        window.setTimeout(() => setEscHintVisible(false), 3000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLocked]);

  if (!isLocked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aegira-lock-title"
      aria-describedby="aegira-lock-desc"
      style={styles.root}
    >
      {/* Screen-reader-only live region */}
      <span
        role="status"
        aria-live="assertive"
        style={styles.srOnly}
      >
        {t.a11yLockedAnnouncement}
      </span>

      <div style={styles.card} className="aegira-hairline-strong">
        <div style={styles.brandRow}>
          {/* Signet */}
          <img
            src="/logos/aegira-signet-white.svg"
            alt=""
            width={36}
            height={36}
            aria-hidden="true"
            style={styles.signet}
          />
          <div>
            <div style={styles.brandName}>{t.brand}</div>
            <div style={styles.brandTagline}>{t.tagline}</div>
          </div>
        </div>

        <h1 id="aegira-lock-title" style={styles.title}>
          {t.locked}
        </h1>

        <p id="aegira-lock-desc" style={styles.identity}>
          {t.loggedInAs(userName, userEmail)}
        </p>

        <button
          ref={buttonRef}
          type="button"
          onClick={onUnlockClick}
          style={styles.unlockButton}
        >
          {t.unlock[unlockStrategy]}
        </button>

        <div style={styles.otherRow}>
          <span style={styles.otherText}>{t.other}</span>
          <button
            type="button"
            onClick={onSignOutClick}
            style={styles.signOutLink}
          >
            {t.signOut}
          </button>
        </div>

        <hr style={styles.divider} />

        <p style={styles.meta}>
          {t.lockedSinceLabel}: {fmtClock(lockedAt, locale)} ·{" "}
          {t.restoreNote}
        </p>

        {escHintVisible && (
          <p role="status" aria-live="polite" style={styles.escHint}>
            {t.escHint}
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(11, 20, 62, 0.92)", // navy-dark with alpha
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    fontFamily: "var(--font-body)",
    color: "var(--c-vellum)",
    padding: "var(--sp-4)",
  },
  card: {
    width: "min(440px, 92vw)",
    padding: "var(--sp-8)",
    backgroundColor: "var(--c-navy)",
    color: "var(--c-vellum)",
    borderRadius: "var(--r-lg)",
    boxShadow: "var(--sh-2)",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--sp-3)",
    marginBottom: "var(--sp-8)",
  },
  signet: {
    width: 36,
    height: 36,
    display: "block",
    flexShrink: 0,
  },
  brandName: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: "0.08em",
    color: "var(--c-vellum)",
  },
  brandTagline: {
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--c-ice)",
    marginTop: 2,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 28,
    lineHeight: 1.15,
    color: "var(--c-vellum)",
    margin: 0,
  },
  identity: {
    marginTop: "var(--sp-2)",
    marginBottom: "var(--sp-8)",
    fontSize: 14,
    lineHeight: 1.5,
    color: "var(--c-ice)",
  },
  unlockButton: {
    width: "100%",
    minHeight: 44,
    backgroundColor: "var(--c-gold)",
    color: "var(--c-navy-dark)",
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: "0.02em",
    border: "0",
    borderRadius: "var(--r-md)",
    padding: "var(--sp-3) var(--sp-4)",
    cursor: "pointer",
    transition: "transform var(--t-fast) var(--ease-out)",
  },
  otherRow: {
    marginTop: "var(--sp-4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--sp-2)",
    fontSize: 13,
  },
  otherText: { color: "var(--c-ice)" },
  signOutLink: {
    background: "transparent",
    border: "0",
    color: "var(--c-vellum)",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: 13,
    padding: 0,
  },
  divider: {
    margin: "var(--sp-8) 0 var(--sp-4)",
    border: 0,
    borderTop: "1px solid rgba(202, 220, 252, 0.16)",
  },
  meta: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    lineHeight: 1.6,
    color: "var(--c-ice)",
    margin: 0,
  },
  escHint: {
    marginTop: "var(--sp-2)",
    fontSize: 12,
    color: "var(--c-gold)",
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};
