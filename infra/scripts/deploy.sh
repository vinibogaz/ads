#!/bin/bash
# deploy.sh — Script de deploy completo no VPS
# Executar de /opt/synthex: bash infra/scripts/deploy.sh
set -euo pipefail

COMPOSE_FILE="infra/compose/docker-compose.prod.yml"
ENV_FILE=".env"
DB_HOST="172.17.0.1"
DB_USER="evolution"
DB_PASS="evolution123"
DB_NAME="synthex"

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
echo "=== 1. Rede Docker persistente para PostgreSQL ==="
docker network create synthex-data 2>/dev/null && echo "   Rede synthex-data criada" || echo "   Rede synthex-data já existe"
docker network connect synthex-data evolution_postgres 2>/dev/null && echo "   evolution_postgres conectado" || echo "   evolution_postgres já na rede"
echo "✅ Rede pronta"

echo ""
echo "=== 2. Inicializar banco de dados ==="
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "   (banco já existe)"
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<'EOSQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOSQL
echo "✅ Banco pronto"

echo ""
echo "=== 3. Instalar dependências Node ==="
npm ci
echo "✅ Dependências instaladas"

echo ""
echo "=== 4. Build do pacote db ==="
npm run build --workspace=@synthex/db
echo "✅ Build @synthex/db concluído"

echo ""
echo "=== 5. Aplicar schema ao banco (Drizzle push) ==="
# Usar IP direto pois deploy roda no host, não no container
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}" \
  npm run db:push --workspace=@synthex/db
echo "✅ Schema aplicado"

echo ""
echo "=== 6. Build e subida dos containers ==="
docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d
echo "✅ Containers no ar"

echo ""
echo "=== 7. Aguardar 20s e verificar saúde ==="
sleep 20
docker compose -f "$COMPOSE_FILE" ps

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001 2>/dev/null || echo "000")
echo ""
echo "API  → http://localhost:4000/health : HTTP $API_STATUS"
echo "Web  → http://localhost:4001        : HTTP $WEB_STATUS"
echo ""

if [ "$API_STATUS" = "200" ]; then
  echo "=== 8. Seed do admin (se necessário) ==="
  echo "   Para criar o primeiro usuário admin:"
  echo "   bash infra/scripts/seed-admin.sh"
fi

echo ""
echo "=== ✅ Deploy concluído ==="
echo "   API: http://164.163.195.86:4000"
echo "   Web: http://164.163.195.86:4001"
