# =============================================================================
# AEGIRA Planner Frontend — Multi-Stage Build (Next.js 15 standalone output)
#
# Stage 1 (deps):   npm install --legacy-peer-deps (React 19 RC + Next 15 conflict)
# Stage 2 (build):  next build → .next/standalone + .next/static + public
# Stage 3 (runner): minimal Alpine + non-root + standalone bundle, port 3000
#
# Final image: ~150 MB (vs ~800 MB without standalone).
#
# Base-Image (node:22-alpine) über den ACR-Artifact-Cache statt anonym von Docker Hub —
# vermeidet das anonyme Pull-Rate-Limit (`toomanyrequests`) im `az acr build`. Cache-Rule
# + authentifiziertes Credential-Set: planner/infra/modules/acrCache.bicep,
# Doku: docs/18_acr-artifact-cache.md.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — Dependencies
# -----------------------------------------------------------------------------
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2 — Build
# -----------------------------------------------------------------------------
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Cache-Bust + Deploy-Marker — MUSS vor `COPY . .` stehen.
# `az acr build` kennt KEIN --no-cache; der ACR-Task-Layer-Cache kann sonst einen
# vor-Änderungs-Stand der `COPY . .`/`npm run build`-Layer wiederverwenden (genau
# der beobachtete „Compiled successfully, aber alter Build"-Fall). Ein pro Deploy
# eindeutiger APP_VERSION-Wert invalidiert diese ENV-Layer und damit zwingend alle
# folgenden — der Build läuft garantiert frisch gegen den hochgeladenen Kontext.
# Zusätzlich wird der Tag als NEXT_PUBLIC_* zur Build-Zeit als String-Literal in die
# (route-stabilen) Client-Chunks gebacken → der ausgelieferte Inhalt ist per Grep
# verifizierbar (siehe deploy.yml „Frontend-Build-Marker verifizieren").
ARG APP_VERSION=dev
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* werden zur BUILD-Zeit in den Client-Bundle eingebacken (nicht zur
# Laufzeit). Ohne dies fällt der API-Client auf http://localhost:8000 zurück →
# "API nicht erreichbar" im Browser. Default = prod-API; per --build-arg übersteuerbar.
ARG NEXT_PUBLIC_API_BASE_URL=https://api.zgpm.aegira.ai
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
# Lockscreen-Idle (Sekunden). MUSS hier zur Build-Zeit gesetzt werden — eine
# Laufzeit-Container-Variable greift bei NEXT_PUBLIC_* NICHT. Default 900 s.
ARG NEXT_PUBLIC_LOCK_IDLE_SEC=900
ENV NEXT_PUBLIC_LOCK_IDLE_SEC=$NEXT_PUBLIC_LOCK_IDLE_SEC
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3 — Runner
# -----------------------------------------------------------------------------
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
