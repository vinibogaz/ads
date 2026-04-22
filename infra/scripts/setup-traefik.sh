#!/bin/bash
# setup-traefik.sh — Diagnóstico e configuração do Traefik para o Orffia Ads
# Executar no VPS: bash infra/scripts/setup-traefik.sh
set -euo pipefail

VPS_IP="${VPS_IP:-31.97.245.90}"
DOMAIN_WEB="${DOMAIN_WEB:-orffia.com}"
DOMAIN_API="${DOMAIN_API:-api.orffia.com}"

echo "=== Diagnóstico Traefik — Orffia Ads ==="
echo "VPS IP: $VPS_IP"
echo ""

# 0. Verificar DNS
echo "=== 0. Verificação de DNS ==="
echo "   Verificando se os domínios apontam para o VPS ($VPS_IP)..."

check_dns() {
  local domain="$1"
  local resolved
  resolved=$(dig +short "$domain" A 2>/dev/null | tail -1 || true)
  if [ "$resolved" = "$VPS_IP" ]; then
    echo "   ✅ $domain → $resolved (OK)"
  elif [ -z "$resolved" ]; then
    echo "   ❌ $domain → sem resposta DNS. Configure o A record no Hostinger!"
  else
    echo "   ❌ $domain → $resolved (esperado: $VPS_IP). DNS incorreto — atualize no Hostinger!"
  fi
}

command -v dig &>/dev/null && {
  check_dns "$DOMAIN_WEB"
  check_dns "www.$DOMAIN_WEB"
  check_dns "$DOMAIN_API"
} || echo "   ⚠️  'dig' não encontrado — instale: apt install dnsutils"

echo ""
echo "   → Para corrigir o DNS, acesse: Hostinger → DNS Zone Editor"
echo "   → Adicione/edite os seguintes registros:"
echo "     A  @                $VPS_IP  (orffia.com)"
echo "     A  www              $VPS_IP  (www.orffia.com)"
echo "     A  api              $VPS_IP  (api.orffia.com)"
echo "     CNAME  app          orffia.com  (app.orffia.com → orffia.com)"
echo ""

# 1. Encontrar container Traefik
echo "=== 1. Diagnóstico Traefik ==="
TRAEFIK_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i traefik | head -1 || true)
if [ -z "$TRAEFIK_CONTAINER" ]; then
  TRAEFIK_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -i traefik | head -1 || true)
  if [ -z "$TRAEFIK_CONTAINER" ]; then
    echo "❌ Nenhum container Traefik encontrado"
    echo "   Instale o Traefik ou use os IPs diretos (porta 4001)"
    exit 1
  fi
  echo "⚠️  Traefik parado: $TRAEFIK_CONTAINER"
  docker start "$TRAEFIK_CONTAINER" || true
else
  echo "✅ Traefik rodando: $TRAEFIK_CONTAINER"
fi

echo ""
echo "=== 2. Redes do Traefik ==="
TRAEFIK_NETWORKS=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || echo "")
echo "   Redes: $TRAEFIK_NETWORKS"

# 3. Verificar se root_default existe
if echo "$TRAEFIK_NETWORKS" | grep -q "root_default"; then
  echo "✅ Traefik está na rede root_default"
else
  echo "⚠️  Traefik NÃO está em root_default — tentando conectar..."
  docker network create root_default 2>/dev/null || echo "   (rede já existe)"
  docker network connect root_default "$TRAEFIK_CONTAINER" 2>/dev/null && \
    echo "✅ Traefik conectado à root_default" || \
    echo "ℹ️  Traefik já estava na rede (ou erro)"
fi

# 4. Conectar containers Orffia Ads à rede do Traefik
echo ""
echo "=== 3. Conectando containers Orffia Ads ao Traefik ==="
for container in ads-web ads-api; do
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    docker network connect root_default "$container" 2>/dev/null && \
      echo "✅ $container → root_default" || \
      echo "ℹ️  $container já está na rede"
  else
    echo "⚠️  $container não está rodando"
  fi
done

# 5. Verificar cert resolver letsencrypt no Traefik
echo ""
echo "=== 4. Verificar Let's Encrypt no Traefik ==="
TRAEFIK_CMD=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range .Args}}{{.}} {{end}}' 2>/dev/null || echo "")
if echo "$TRAEFIK_CMD" | grep -q "letsencrypt\|acme"; then
  echo "✅ Let's Encrypt configurado no Traefik"
else
  echo "⚠️  Let's Encrypt NÃO detectado nos args do Traefik"
  echo "   Verifique se o traefik.yml ou command inclui:"
  echo "   --certificatesresolvers.letsencrypt.acme.email=<seu-email>"
  echo "   --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
  echo "   --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
  echo ""
  echo "   Veja: infra/traefik/traefik.yml para configuração de referência"
fi

echo ""
echo "=== 5. Status dos containers Orffia Ads ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E "orffia|NAMES" || echo "   Nenhum container orffia rodando"

echo ""
echo "=== 6. Status final ==="
echo "   Acesso direto (fallback sem DNS):"
echo "   Web: http://$VPS_IP:4001"
echo "   API: http://$VPS_IP:4000/health"
echo ""
echo "   Via domínio (após DNS configurado):"
echo "   Web: https://$DOMAIN_WEB"
echo "   API: https://$DOMAIN_API/health"
echo ""
echo "   Para reiniciar containers com nova config Traefik:"
echo "   cd /opt/orffia && docker compose -p orffia -f infra/compose/docker-compose.prod.yml up -d --force-recreate"
