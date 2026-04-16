# syntax=docker/dockerfile:1
# Synthex API — Fastify Backend (Multi-stage Build)

# ==================== STAGE 1: Dependencies ====================
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules (argon2)
RUN apk add --no-cache python3 make g++

# Copy workspace config
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages packages/

# Install dependencies (including workspace packages)
RUN npm install --frozen-lockfile

# ==================== STAGE 2: Builder ====================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY apps/api apps/api
COPY package.json turbo.json tsconfig.json ./

# Build using Turborepo
RUN npm run build -- --filter=@synthex/api

# ==================== STAGE 3: Production Runtime ====================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install only production dependencies
RUN apk add --no-cache python3 make g++ curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy built application
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package.json ./package.json

# Copy workspace packages (needed for @synthex/* imports)
COPY --from=builder --chown=apiuser:nodejs /app/packages ./packages
COPY --from=deps --chown=apiuser:nodejs /app/node_modules ./node_modules

USER apiuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
