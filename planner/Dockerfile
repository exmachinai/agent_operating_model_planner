# =============================================================================
# AEGIRA Planner Frontend — Multi-Stage Build (Next.js 15 standalone output)
#
# Stage 1 (deps):   npm install --legacy-peer-deps (React 19 RC + Next 15 conflict)
# Stage 2 (build):  next build → .next/standalone + .next/static + public
# Stage 3 (runner): minimal Alpine + non-root + standalone bundle, port 3000
#
# Final image: ~150 MB (vs ~800 MB without standalone).
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — Dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2 — Build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* werden zur BUILD-Zeit in den Client-Bundle eingebacken (nicht zur
# Laufzeit). Ohne dies fällt der API-Client auf http://localhost:8000 zurück →
# "API nicht erreichbar" im Browser. Default = prod-API; per --build-arg übersteuerbar.
ARG NEXT_PUBLIC_API_BASE_URL=https://api.zgpm.aegira.ai
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3 — Runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner
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
