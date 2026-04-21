# syntax=docker/dockerfile:1
# Synthex Web — Next.js Frontend (Multi-stage Build)

# ==================== STAGE 1: Dependencies ====================
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy workspace config
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages packages/

# Install dependencies
RUN npm install --frozen-lockfile

# ==================== STAGE 2: Builder ====================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY apps/web apps/web
COPY package.json turbo.json tsconfig.json ./

# Next.js collects telemetry data (disable in production)
ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_ENABLE_STRICT=0

# Fix: Next.js SWC download calls 'yarn config get registry'; shim yarn to succeed
RUN echo '#!/bin/sh' > /usr/local/bin/yarn \
    && echo 'echo https://registry.npmjs.org/' >> /usr/local/bin/yarn \
    && chmod +x /usr/local/bin/yarn

# Build using Turborepo
RUN npm run build -- --filter=@orffia/web

# ==================== STAGE 3: Production Runtime ====================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    apk add --no-cache curl

# outputFileTracingRoot = monorepo root, so standalone preserves apps/web/server.js path.
# Static assets and public must match that path so server.js can locate them.
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Copy node_modules (standalone nao inclui em monorepos)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
