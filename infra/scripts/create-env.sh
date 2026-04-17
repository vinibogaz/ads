#!/bin/bash
# Cria o arquivo .env de produção em /opt/synthex/
# Executar no VPS: bash infra/scripts/create-env.sh
# ⚠️  Preencha OPENAI_API_KEY, ANTHROPIC_API_KEY e CORS_ORIGIN antes de usar
set -euo pipefail

ENV_FILE="/opt/synthex/.env"

if [ -f "$ENV_FILE" ]; then
  echo "⚠️  $ENV_FILE já existe. Fazendo backup..."
  cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
fi

cat > "$ENV_FILE" << 'EOF'
# ====================
# SYNTHEX — PRODUÇÃO
# ====================
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# DATABASE — PostgreSQL existente no VPS
DATABASE_URL=postgresql://evolution:evolution123@172.17.0.1:5432/synthex

# REDIS
REDIS_PASSWORD=eb8afbe01f497f7835bf97b19334af5f
REDIS_URL=redis://:eb8afbe01f497f7835bf97b19334af5f@redis:6379/0

# JWT
JWT_ACCESS_SECRET=b3c9b65b41ddefeb4c709fe32517663cdb4a4ead44c526090cfe85f8105fc9dc
JWT_REFRESH_SECRET=f278de1ca19712be61d9854806ec016aa50f550e8c9a9eb1549253598733643b
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CRIPTOGRAFIA
ENCRYPTION_KEY=3e0b72aea5ff0085d2e253938b36453dfb2b018b8d068fd90337059374b0f53e

# AI WORKER
AI_WORKER_URL=http://ai-worker:8000
AI_WORKER_SECRET=3482207b759e66f8ee76fe9d9961e479

# ⚠️  PREENCHER: API keys externas
OPENAI_API_KEY=sk-proj-PREENCHER
ANTHROPIC_API_KEY=sk-ant-PREENCHER

# CORS — URL do frontend (IP do VPS ou domínio)
CORS_ORIGIN=http://164.163.195.86:4001

# FRONTEND
NEXT_PUBLIC_API_URL=http://164.163.195.86:4000

# RATE LIMITING
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
EOF

chmod 600 "$ENV_FILE"
echo "✅ $ENV_FILE criado com permissão 600"
echo ""
echo "⚠️  Atenção: preencha OPENAI_API_KEY e ANTHROPIC_API_KEY no arquivo antes de subir os containers"
echo "   nano $ENV_FILE"
