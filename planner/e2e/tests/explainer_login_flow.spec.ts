import { test, expect } from "@playwright/test";
import crypto from "node:crypto";

/**
 * Flow MFA → Explainer → Planner — ECHTER Login über den LockScreen (nicht über
 * vorinjizierte Session). Regression-Guard für den Bug, dass der Onboarding-Redirect
 * am Seiten-Mount (vor dem Login) lief und nach MFA nicht mehr feuerte. Der Redirect
 * MUSS jetzt am Unlock-Event (LockProvider.onUnlocked) hängen.
 *
 * Bewusst OHNE die auth-Fixture (die würde den Lock per sessionStorage umgehen).
 */

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";
const PASSWORD = "Test1234!passWORD";

function base32Decode(s: string): Buffer {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let b = "";
  for (const ch of s.replace(/=+$/, "").toUpperCase()) if (A.indexOf(ch) >= 0) b += A.indexOf(ch).toString(2).padStart(5, "0");
  const o: number[] = [];
  for (let i = 0; i + 8 <= b.length; i += 8) o.push(parseInt(b.slice(i, i + 8), 2));
  return Buffer.from(o);
}
function totpNow(secretB32: string): string {
  const k = base32Decode(secretB32);
  const c = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(c));
  const h = crypto.createHmac("sha1", k).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return (((h.readUInt32BE(o) & 0x7fffffff) % 1e6) + "").padStart(6, "0");
}
function qparam(uri: string, key: string): string | null {
  const m = new RegExp(`[?&]${key}=([^&]+)`).exec(uri);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Legt einen ENROLLTEN Nutzer an (register→verify→login→unlock) und gibt Creds + Secret. */
async function enrollUser(request: import("@playwright/test").APIRequestContext) {
  const email = `login+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const reg = await request.post(`${API}/v1/auth/register`, { data: { email, password: PASSWORD } });
  expect(reg.status()).toBe(201);
  const token = qparam((await reg.json()).verify_url, "token")!;
  await request.post(`${API}/v1/auth/verify`, { data: { token } });
  const login = await request.post(`${API}/v1/auth/login`, { data: { email, password: PASSWORD } });
  const secret = qparam((await login.json()).otpauth_uri, "secret")!;
  // Enrollen abschließen, damit der UI-Login danach direkt 'totp_required' liefert.
  await request.post(`${API}/v1/auth/unlock`, { data: { email, password: PASSWORD, code: totpNow(secret) } });
  return { email, secret };
}

test("MFA-Login über LockScreen → Erstnutzer landet auf dem Explainer", async ({ page, request }) => {
  const { email, secret } = await enrollUser(request);

  await page.goto("/"); // gesperrt — LockScreen erscheint
  await expect(page.locator("#lk-email")).toBeVisible();

  // Faktor 1
  await page.locator("#lk-email").fill(email);
  await page.locator("#lk-pw").fill(PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Faktor 2 (TOTP)
  await expect(page.locator("#lk-code")).toBeVisible();
  await page.locator("#lk-code").fill(totpNow(secret));
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Nach erfolgreichem Unlock → Onboarding-Redirect.
  await expect(page).toHaveURL(/\/explainer$/, { timeout: 10000 });
  await expect(page.getByTestId("explainer-frame")).toBeVisible();
});
