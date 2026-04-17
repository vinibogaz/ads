#!/bin/bash
# Cria o arquivo .env de produção em /opt/orffia/
# Executar no VPS: bash infra/scripts/create-env.sh
# ⚠️  Preencha OPENAI_API_KEY e ANTHROPIC_API_KEY antes de usar
set -euo pipefail

ENV_FILE="/opt/orffia/.env"

if [ -f "$ENV_FILE" ]; then
  echo "⚠️  $ENV_FILE já existe. Fazendo backup..."
  cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
fi

# Gerar secrets únicos (nunca commitar no Git)
REDIS_PASSWORD=$(openssl rand -hex 20)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
AI_WORKER_SECRET=$(openssl rand -hex 16)

cat > "$ENV_FILE" << EOF
# ====================
# ORFFIA — PRODUÇÃO
# ====================
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# DATABASE — evolution_postgres via rede orffia-data (persistente)
DATABASE_URL=postgresql://evolution:evolution123@evolution_postgres:5432/orffia

# REDIS
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# JWT (gerado em $(date -u +%Y-%m-%dT%H:%M:%SZ))
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CRIPTOGRAFIA
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# AI WORKER
AI_WORKER_URL=http://ai-worker:8000
AI_WORKER_SECRET=${AI_WORKER_SECRET}

# ⚠️  PREENCHER: API keys externas
OPENAI_API_KEY=sk-proj-PREENCHER
ANTHROPIC_API_KEY=sk-ant-PREENCHER

# CORS — URL do frontend (domínio oficial)
CORS_ORIGIN=https://orffia.com

# FRONTEND
NEXT_PUBLIC_API_URL=https://api.orffia.com

# TRAEFIK — Domínios de roteamento
DOMAIN_WEB=orffia.com
DOMAIN_API=api.orffia.com
TRAEFIK_ENTRYPOINT=websecure

# RATE LIMITING
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
EOF

chmod 600 "$ENV_FILE"
echo "✅ $ENV_FILE criado com permissão 600 (secrets gerados com openssl rand)"
echo ""
echo "⚠️  Preencha antes de fazer deploy:"
echo "   OPENAI_API_KEY e ANTHROPIC_API_KEY"
echo "   nano $ENV_FILE"
