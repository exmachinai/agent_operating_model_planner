import { test as base, expect, request, APIRequestContext } from "@playwright/test";
import crypto from "node:crypto";

/**
 * Auth-Fixture — öffnet den TOTP-2FA-Lockscreen für die browserbasierten Specs.
 *
 * Hintergrund: Die App startet gesperrt (lib/lockProvider.tsx) und entsperrt nur,
 * wenn `sessionStorage["aegira.session"]` = `{token, exp}` enthält, das die API per
 * `GET /v1/auth/session` (Bearer-Token) als gültig bestätigt. Routen unter `/auth/*`
 * sind ausgenommen.
 *
 * Strategie:
 *  - Pro Worker EINMAL eine echte Sitzung minten (register → verify → login →
 *    TOTP-Enroll → unlock) über einen APIRequestContext (kein Browser-CORS).
 *  - Das Token VOR den App-Skripten in sessionStorage injizieren (context.addInitScript),
 *    weil Playwrights storageState kein sessionStorage trägt.
 *
 * Die Specs importieren `{ test, expect }` aus dieser Datei statt aus
 * `@playwright/test`; dadurch ist jeder mit dieser Fixture erzeugte Browser-Context
 * bereits entsperrt.
 */

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";

export interface MintedSession {
  token: string;
  exp: number; // Unix-Sekunden
  email: string;
  isAdmin: boolean;
}

// ─── TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 Stellen) — stdlib, keine Dependency ──────
function base32Decode(s: string): Buffer {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of s.replace(/=+$/, "").toUpperCase()) {
    const v = A.indexOf(ch);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const b: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) b.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(b);
}

export function totpNow(secretB32: string, atMs: number = Date.now()): string {
  const key = base32Decode(secretB32);
  const c = Math.floor(atMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(c));
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return (((h.readUInt32BE(o) & 0x7fffffff) % 1000000) + "").padStart(6, "0");
}

function parseQueryParam(uri: string, key: string): string | null {
  // otpauth:// und absolute verify_url robust parsen, ohne echten Origin zu brauchen.
  const normalized = uri.replace(/^otpauth:\/\//, "http://");
  try {
    return new URL(normalized, "http://placeholder.invalid").searchParams.get(key);
  } catch {
    const m = new RegExp(`[?&]${key}=([^&]+)`).exec(uri);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

/**
 * Mintet eine gültige Session gegen die laufende API. Eindeutige E-Mail pro Aufruf,
 * damit verifizierte Konten keinen 409 auslösen.
 */
export async function mintSession(ctx: APIRequestContext): Promise<MintedSession> {
  const email = `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "Test1234!passWORD";

  const reg = await ctx.post("/v1/auth/register", { data: { email, password } });
  if (reg.status() !== 201) {
    throw new Error(`register fehlgeschlagen: ${reg.status()} ${await reg.text()}`);
  }
  const verifyUrl = (await reg.json()).verify_url as string;
  const verifyToken = parseQueryParam(verifyUrl, "token");
  if (!verifyToken) throw new Error(`kein verify-token in ${verifyUrl}`);

  const ver = await ctx.post("/v1/auth/verify", { data: { token: verifyToken } });
  if (!ver.ok()) throw new Error(`verify fehlgeschlagen: ${ver.status()} ${await ver.text()}`);

  const login = await ctx.post("/v1/auth/login", { data: { email, password } });
  if (!login.ok()) throw new Error(`login fehlgeschlagen: ${login.status()} ${await login.text()}`);
  const loginBody = await login.json();
  const otpauth = loginBody.otpauth_uri as string;
  if (!otpauth) {
    throw new Error(`login lieferte kein otpauth_uri (status=${loginBody.status}).`);
  }
  const secret = parseQueryParam(otpauth, "secret");
  if (!secret) throw new Error(`kein TOTP-secret in ${otpauth}`);

  const code = totpNow(secret);
  const unlock = await ctx.post("/v1/auth/unlock", { data: { email, password, code } });
  if (!unlock.ok()) {
    throw new Error(`unlock fehlgeschlagen: ${unlock.status()} ${await unlock.text()}`);
  }
  const u = await unlock.json();
  return {
    token: u.token as string,
    exp: u.expires_at as number,
    email,
    isAdmin: !!u.is_admin,
  };
}

export const test = base.extend<
  { authedContext: void },
  { session: MintedSession }
>({
  // Worker-scoped: EINMAL pro Worker minten (teuer: register/verify/login/unlock).
  session: [
    async ({}, use) => {
      const ctx = await request.newContext({ baseURL: API });
      try {
        const s = await mintSession(ctx);
        await use(s);
      } finally {
        await ctx.dispose();
      }
    },
    { scope: "worker" },
  ],

  // Vor JEDEM Test: Token in sessionStorage injizieren, BEVOR App-Skripte laufen.
  // Auto-Fixture, damit die Specs nichts explizit anfordern müssen.
  authedContext: [
    async ({ context, session }, use) => {
      await context.addInitScript(
        ([token, exp]) => {
          try {
            window.sessionStorage.setItem(
              "aegira.session",
              JSON.stringify({ token, exp }),
            );
            // Explainer-Onboarding (MFA → Explainer → Planner) für E2E überspringen:
            // die Specs prüfen den Planner, nicht das Onboarding. Echte Erstnutzer
            // sehen den Explainer; hier als „gesehen" markiert.
            window.localStorage.setItem("aegira.explainer.seen", "1");
          } catch {
            /* Storage nicht verfügbar */
          }
        },
        [session.token, session.exp] as const,
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
