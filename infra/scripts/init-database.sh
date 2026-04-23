#!/bin/bash
# Cria o banco orffia_ads e roda as migrations
# Uso: bash infra/scripts/init-database.sh
set -euo pipefail

echo "=== Orffia Ads — Init Database ==="

# Criar banco
docker exec -i $(docker ps -q -f name=postgres) psql -U evolution << 'EOF'
SELECT 'CREATE DATABASE orffia_ads'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'orffia_ads')\gexec
\c orffia_ads
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

echo "✓ Banco orffia_ads criado"

# Rodar migration de schema base (core + auth) — se existir
if [ -f "apps/api/src/db/migrations/0000_init.sql" ]; then
  docker exec -i $(docker ps -q -f name=postgres) psql -U evolution -d orffia_ads \
    < apps/api/src/db/migrations/0000_init.sql
  echo "✓ Migration 0000_init.sql aplicada"
fi

# Rodar migration do schema Ads
docker exec -i $(docker ps -q -f name=postgres) psql -U evolution -d orffia_ads \
  < apps/api/src/db/migrations/0001_ads_schema.sql

echo "✓ Migration 0001_ads_schema.sql aplicada"
echo ""
echo "=== Banco pronto! ==="
echo "DATABASE_URL=postgresql://evolution:evolution123@172.17.0.1:5432/orffia_ads"
