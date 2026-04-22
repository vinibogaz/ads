#!/bin/bash
# seed-admin.sh — Cria o primeiro tenant + usuário admin via API
# Executar de /opt/orffia APÓS o deploy: bash infra/scripts/seed-admin.sh
set -euo pipefail

API_URL="http://localhost:4000/api/v1"

# Configurar admin (pode sobrescrever via env vars)
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@orffia.io}"
ADMIN_NAME="${ADMIN_NAME:-Admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ChangeMe123!}"
TENANT_NAME="${TENANT_NAME:-Orffia Ads}"
TENANT_SLUG="${TENANT_SLUG:-orffia}"

echo "=== Seed do Admin ==="
echo "   Email: $ADMIN_EMAIL"
echo "   Tenant: $TENANT_NAME ($TENANT_SLUG)"
echo ""

# Verificar se API está saudável
if ! curl -sf http://localhost:4000/health > /dev/null; then
  echo "❌ API não está respondendo em localhost:4000"
  echo "   Verifique com: docker logs ads-api"
  exit 1
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"name\": \"$ADMIN_NAME\",
    \"tenantName\": \"$TENANT_NAME\",
    \"tenantSlug\": \"$TENANT_SLUG\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Admin criado com sucesso!"
  echo ""
  echo "   Email:    $ADMIN_EMAIL"
  echo "   Senha:    $ADMIN_PASSWORD"
  echo "   Tenant:   $TENANT_NAME"
  echo ""
  echo "⚠️  Troque a senha em produção!"
  echo "   POST $API_URL/auth/login"
elif [ "$HTTP_CODE" = "409" ]; then
  echo "ℹ️  Usuário ou tenant já existe (HTTP 409) — seed não necessário"
else
  echo "❌ Erro ao criar admin (HTTP $HTTP_CODE):"
  echo "   $BODY"
  exit 1
fi
