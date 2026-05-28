# Planner App (Skeleton)

> Next.js 15 (App Router) Skeleton der **AEGIRA Agent Operating Model Planner App**.
> Stand: 28.05.2026 — Skelett mit den drei Pflicht-Komponenten als Referenz-Implementierung. Volle App-Implementierung folgt in Phase 2 (siehe `docs/02_architecture-option-b.md` §19).

## Was schon da ist

| Pfad | Inhalt |
|---|---|
| `app/styles/tokens.css` | Brand- und UI-Design-Tokens (Single Source of Truth, abgeleitet aus `BRAND.md`) |
| `components/LockScreen.tsx` | Vollständige Lock-Screen-Implementierung — Spec `docs/06 §14` |
| `components/AgentTrace.tsx` | Multi-Agent-Trace-Karte — Spec `docs/05 §7` |
| `components/HitlApprovalPrompt.tsx` | Inline-HITL-Approval-Prompt — Spec `docs/05 §7.3` |
| `public/logos/` | Brand-Logos aus `_assets/` für Direkt-Einbindung |
| `public/favicon.svg` | Brand-Favicon |

## Was noch fehlt

- Next.js Boot-Scaffold (`package.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`)
- `lib/lockProvider.tsx` (Idle-Detection + Lock-State-Management)
- `lib/auth/` Entra-ID-Integration
- `app/(auth)/login/page.tsx`
- `app/(workspace)/page.tsx` (Dashboard)
- `app/(workspace)/projects/[id]/page.tsx`
- restliche Pflicht-Komponenten aus `docs/05 §6.1`
- i18n-Strings (de/en) via `next-intl`
- Cypress + Playwright E2E
- Lighthouse-CI Performance-Budget

## Brand-Tokens verwenden

Importiere die Tokens einmal global:

```tsx
// app/layout.tsx (folgt)
import "./styles/tokens.css";
```

Alle Komponenten benutzen ausschließlich Tokens, niemals hardcoded Hex-Werte. Bei neuer Farbe: erst `BRAND.md` ergänzen, dann `tokens.css` updaten.

## Komponenten-Demo

Beispielhafte Verwendung in einer Demo-Page:

```tsx
import { AgentTrace } from "@/components/AgentTrace";
import { HitlApprovalPrompt } from "@/components/HitlApprovalPrompt";

export default function Demo() {
  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <AgentTrace
        agentName="pmo-agent"
        agentRole="Lead / Orchestrator"
        pvmCode="L"
        iteration={1}
        thinkingSummary="Strukturiere den Auftrag in 4 Phasen nach MECE…"
        toolCalls={[
          {
            id: "tc_1",
            toolName: "skill:zgpm-compose",
            inputPreview: "{ auftrag: '…' }",
            outputPreview: "{ phases: 4, meilensteine: 12 }",
            durationMs: 1840,
          },
        ]}
        status="completed"
        tokensUsed={12345}
        startedAt={new Date()}
      />

      <HitlApprovalPrompt
        milestoneId="M02"
        milestoneTitle="API-Architektur freigegeben"
        phaseName="Design"
        risk="gelb"
        riskIds={["R03", "R07"]}
        activities={{ done: 5, total: 5 }}
        reviewer={{
          status: "PASS_WITH_NOTES",
          findings: [
            {
              severity: "WARNING",
              rule: "ZGPM-Pyramid",
              message: "Aufwand für A02 wirkt unterschätzt.",
              location: "plan/activities/M02.yaml::A02",
            },
          ],
        }}
        effort={{ planned: 5, actual: 4.5 }}
        onApprove={() => console.log("approve")}
        onRequestChanges={(m) => console.log("changes", m)}
        onStop={() => console.log("stop")}
      />
    </main>
  );
}
```

## Lizenz

Apache-2.0. © 2026 exmachinAI GmbH.
