#!/bin/bash
# deploy.sh — Script de deploy completo no VPS
# Executar de /opt/synthex: bash infra/scripts/deploy.sh
set -euo pipefail

COMPOSE_FILE="infra/compose/docker-compose.prod.yml"
ENV_FILE=".env"

echo "=== Synthex Deploy ==="
echo ""

# 0. Verificar .env
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env não encontrado em $(pwd)/"
  echo "   Execute primeiro: bash infra/scripts/create-env.sh"
  exit 1
fi
if grep -q "sk-proj-PREENCHER" "$ENV_FILE" 2>/dev/null; then
  echo "⚠️  AVISO: OPENAI_API_KEY ainda é placeholder — ai-worker ficará unhealthy"
fi
set -a; source "$ENV_FILE"; set +a
echo "✅ .env carregado"

echo ""
echo "=== 1. Inicializar banco de dados ==="
PGPASSWORD=evolution123 psql -h 172.17.0.1 -U evolution -d postgres <<'EOSQL' || true
CREATE DATABASE synthex;
EOSQL
PGPASSWORD=evolution123 psql -h 172.17.0.1 -U evolution -d synthex <<'EOSQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOSQL
echo "✅ Banco pronto"

echo ""
echo "=== 2. Instalar dependências Node ==="
npm ci
echo "✅ Dependências instaladas"

echo ""
echo "=== 3. Build do pacote db (necessário antes do drizzle push) ==="
npm run build --workspace=@synthex/db
echo "✅ Build @synthex/db concluído"

echo ""
echo "=== 4. Aplicar schema ao banco (Drizzle push) ==="
npm run db:push --workspace=@synthex/db
echo "✅ Schema aplicado"

echo ""
echo "=== 5. Build e subida dos containers ==="
docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d
echo "✅ Containers no ar"

echo ""
echo "=== 6. Aguardar 20s e verificar saúde ==="
sleep 20
docker compose -f "$COMPOSE_FILE" ps

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001 2>/dev/null || echo "000")
echo ""
echo "API  → http://localhost:4000/health : HTTP $API_STATUS"
echo "Web  → http://localhost:4001        : HTTP $WEB_STATUS"
echo ""
echo "=== ✅ Deploy concluído ==="
echo "   API: http://164.163.195.86:4000"
echo "   Web: http://164.163.195.86:4001"
