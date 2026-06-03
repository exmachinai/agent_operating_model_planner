/**
 * Lighthouse A11y-Audit (mobil) für die AEGIRA-Planner-App.
 * Teststrategie v0.9.5 §10/§13 — Ziel: Accessibility-Score ≥ 0.95 je Route.
 *
 * Die App liegt hinter einem TOTP-2FA-Lockscreen (lib/lockProvider.tsx). Würde
 * Lighthouse einfach navigieren, auditierte es nur den LockScreen. Darum:
 *   1. Eine echte Session über die API minten (register → verify → login →
 *      TOTP-Enroll → unlock) — identisch zu fixtures/auth.ts, aber mit Node-`fetch`.
 *   2. Pro Audit-Route ein Projekt bis zum nötigen Gate seeden (analog fixtures/seed.ts).
 *   3. Das Token VOR den App-Skripten via Puppeteer `evaluateOnNewDocument` in
 *      sessionStorage["aegira.session"] = {token, exp} injizieren, damit die
 *      auditierte Navigation bereits entsperrt ist.
 *   4. Lighthouse über die User-Flow-API (startFlow) mit dieser Puppeteer-`page`
 *      fahren, sodass die Session die Navigation trägt.
 *
 * Exit-Code ≠ 0, wenn eine Route < 0.95 → CI-tauglich.
 *
 * Lauf:  cd planner/e2e && npm run lh:a11y
 * Konfig per Env:  WEB_BASE_URL (Default http://127.0.0.1:3001)
 *                  API_BASE_URL (Default http://127.0.0.1:8001)
 *                  LH_THRESHOLD (Default 0.95)
 */

import crypto from "node:crypto";
import { startFlow } from "lighthouse";
import puppeteer from "puppeteer";

const WEB = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001";
const THRESHOLD = Number(process.env.LH_THRESHOLD ?? "0.95");
const PASSWORD = "Test1234!passWORD";

// ─── TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 Stellen) — stdlib, keine Dependency ──────
function base32Decode(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let b = "";
  for (const ch of s.replace(/=+$/, "").toUpperCase())
    if (A.indexOf(ch) >= 0) b += A.indexOf(ch).toString(2).padStart(5, "0");
  const o = [];
  for (let i = 0; i + 8 <= b.length; i += 8) o.push(parseInt(b.slice(i, i + 8), 2));
  return Buffer.from(o);
}
function totpNow(s) {
  const k = base32Decode(s);
  const c = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(c));
  const h = crypto.createHmac("sha1", k).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return (((h.readUInt32BE(o) & 0x7fffffff) % 1e6) + "").padStart(6, "0");
}

function qparam(uri, key) {
  const normalized = String(uri).replace(/^otpauth:\/\//, "http://");
  try {
    return new URL(normalized, "http://placeholder.invalid").searchParams.get(key);
  } catch {
    const m = new RegExp(`[?&]${key}=([^&]+)`).exec(uri);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

async function jpost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return r;
}

// ─── Session minten (register → verify → login → TOTP-Enroll → unlock) ───────────
async function mintSession() {
  const email = `lh+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  const reg = await jpost("/v1/auth/register", { email, password: PASSWORD });
  if (reg.status !== 201) throw new Error(`register: ${reg.status} ${await reg.text()}`);
  const verifyToken = qparam((await reg.json()).verify_url, "token");
  if (!verifyToken) throw new Error("kein verify-token");

  const ver = await jpost("/v1/auth/verify", { token: verifyToken });
  if (!ver.ok) throw new Error(`verify: ${ver.status} ${await ver.text()}`);

  const login = await jpost("/v1/auth/login", { email, password: PASSWORD });
  if (!login.ok) throw new Error(`login: ${login.status} ${await login.text()}`);
  const secret = qparam((await login.json()).otpauth_uri, "secret");
  if (!secret) throw new Error("kein TOTP-secret");

  const unlock = await jpost("/v1/auth/unlock", { email, password: PASSWORD, code: totpNow(secret) });
  if (!unlock.ok) throw new Error(`unlock: ${unlock.status} ${await unlock.text()}`);
  const u = await unlock.json();
  return { token: u.token, exp: u.expires_at, email };
}

// ─── Projekt bis Gate seeden (analog fixtures/seed.ts) ───────────────────────────
async function seedProject(toGate) {
  const create = await jpost("/v1/projects", { title: "LH A11y Seed", description: "lighthouse" });
  if (create.status !== 201) throw new Error(`create: ${create.status} ${await create.text()}`);
  const pid = (await create.json()).id;

  const step = async (path, body) => {
    const r = await jpost(path, body);
    if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  };

  await fetch(`${API}/v1/projects/${pid}/understanding`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_type: "it",
      project_nature: "technical",
      understanding_summary: "Seed-Vorhaben mit klarem Ziel.",
      aegira_internal: false,
    }),
  });
  await step(`/v1/projects/${pid}/approve-understanding`); // Gate 1

  if (toGate >= 2) {
    await step(`/v1/projects/${pid}/guardrails/clear`, { proceed: true });
    await step(`/v1/projects/${pid}/plan`); // erzeugt v1
    await step(`/v1/projects/${pid}/plan/milestones/done`); // Schritt 6a
    await step(`/v1/projects/${pid}/approve-plan`); // Gate 2
  }
  if (toGate >= 3) {
    await step(`/v1/projects/${pid}/harness`); // kompiliert Entwurf
    await step(`/v1/projects/${pid}/harness/approve`); // Gate 3
  }
  return pid;
}

const LH_CONFIG = {
  extends: "lighthouse:default",
  settings: {
    onlyCategories: ["accessibility"],
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  },
};

async function main() {
  console.log(`[lh:a11y] Web=${WEB}  API=${API}  Schwelle=${THRESHOLD} (mobil)\n`);

  const session = await mintSession();
  console.log(`[lh:a11y] Session gemintet: ${session.email}`);

  // Ein Projekt für plan+review (Gate 2 genügt für beide), eins für harness (Gate 3).
  const pidGate2 = await seedProject(2);
  const pidGate3 = await seedProject(3);
  console.log(`[lh:a11y] Seeds: gate2=${pidGate2}  gate3=${pidGate3}\n`);

  const routes = [
    // Explainer-Onboarding (statisch, hinter 2FA ausgeliefert) — kein Seed nötig.
    { name: "explainer", path: `/explainer/index.html` },
    { name: "plan", path: `/projects/${pidGate2}/plan` },
    { name: "harness", path: `/projects/${pidGate3}/harness` },
    { name: "review", path: `/projects/${pidGate2}/review` },
  ];

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];
  try {
    const page = await browser.newPage();
    // Session VOR jedem Dokument injizieren → auditierte Navigation startet entsperrt.
    await page.evaluateOnNewDocument(
      (s) => {
        try {
          sessionStorage.setItem("aegira.session", s);
        } catch {
          /* sessionStorage nicht verfügbar */
        }
      },
      JSON.stringify({ token: session.token, exp: session.exp }),
    );

    const flow = await startFlow(page, { config: LH_CONFIG });
    for (const r of routes) {
      await flow.navigate(`${WEB}${r.path}`, { stepName: r.name });
    }

    const flowResult = await flow.createFlowResult();
    flowResult.steps.forEach((step, i) => {
      const route = routes[i];
      const cat = step.lhr.categories.accessibility;
      const score = cat.score;
      // Nur Audits der A11y-Kategorie betrachten (über deren auditRefs).
      const failed = cat.auditRefs
        .map((ref) => step.lhr.audits[ref.id])
        .filter((a) => a && a.score !== null && a.score < 1)
        .map((a) => a.id);
      results.push({ ...route, score, failed });
    });
  } finally {
    await browser.close();
  }

  console.log("─".repeat(56));
  let allPass = true;
  for (const r of results) {
    const pct = r.score === null ? "n/a" : Math.round(r.score * 100);
    const ok = r.score !== null && r.score >= THRESHOLD;
    if (!ok) allPass = false;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${r.name.padEnd(8)} ${pct}%  (${r.path})`);
    if (!ok && r.failed.length) {
      // Nur die A11y-Kategorie-Audits benennen, die fehlschlugen.
      console.log(`        fehlgeschlagene Audits: ${r.failed.join(", ")}`);
    }
  }
  console.log("─".repeat(56));

  if (!allPass) {
    console.error(`\n[lh:a11y] FAIL — mindestens eine Route < ${THRESHOLD}.`);
    process.exit(1);
  }
  console.log(`\n[lh:a11y] OK — alle Routen ≥ ${THRESHOLD}.`);
}

main().catch((err) => {
  console.error("[lh:a11y] Fehler:", err);
  process.exit(2);
});
