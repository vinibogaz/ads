#!/bin/bash
# setup-traefik.sh — Diagnóstico e configuração do Traefik para o ORFFIA
# Executar no VPS: bash infra/scripts/setup-traefik.sh
set -euo pipefail

echo "=== Diagnóstico Traefik ==="
echo ""

# 1. Encontrar container Traefik
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
echo "=== Redes do Traefik ==="
TRAEFIK_NETWORKS=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || echo "")
echo "   Redes: $TRAEFIK_NETWORKS"

# 2. Encontrar a rede pública do Traefik
TRAEFIK_NET=""
for net in $TRAEFIK_NETWORKS; do
  # Pular redes bridge padrão
  if [ "$net" != "bridge" ] && [ "$net" != "host" ] && [ "$net" != "none" ]; then
    TRAEFIK_NET="$net"
    break
  fi
done

if [ -z "$TRAEFIK_NET" ]; then
  echo "⚠️  Traefik está só na rede bridge padrão."
  echo "   Criando rede traefik-public..."
  docker network create traefik-public 2>/dev/null || echo "   (já existe)"
  docker network connect traefik-public "$TRAEFIK_CONTAINER" 2>/dev/null || echo "   (já conectado)"
  TRAEFIK_NET="traefik-public"
fi

echo "✅ Rede Traefik identificada: $TRAEFIK_NET"

# 3. Criar rede traefik-public se necessário
docker network create traefik-public 2>/dev/null || true

# 4. Se rede do Traefik é diferente de traefik-public, criar alias
if [ "$TRAEFIK_NET" != "traefik-public" ]; then
  echo ""
  echo "⚠️  Rede do Traefik é '$TRAEFIK_NET', não 'traefik-public'"
  echo "   Atualize o .env do compose com:"
  echo "   Edite infra/compose/docker-compose.prod.yml e mude traefik-public para: $TRAEFIK_NET"
  echo ""
  echo "   OU crie a rede e conecte o Traefik:"
  echo "   docker network connect traefik-public $TRAEFIK_CONTAINER"
fi

# 5. Conectar containers ORFFIA à rede do Traefik
echo ""
echo "=== Conectando containers ORFFIA ao Traefik ==="
for container in orffia-web orffia-api; do
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    docker network connect traefik-public "$container" 2>/dev/null && \
      echo "✅ $container → traefik-public" || \
      echo "ℹ️  $container já está na rede (ou erro)"
  else
    echo "⚠️  $container não está rodando"
  fi
done

echo ""
echo "=== Config do Traefik ==="
echo "   Verificando se Docker provider está habilitado..."
docker inspect "$TRAEFIK_CONTAINER" --format '{{range .Args}}{{.}} {{end}}' 2>/dev/null | tr ' ' '\n' | grep -E "docker|provider" || \
  echo "   (não foi possível verificar via args — verifique traefik.yml)"

echo ""
echo "=== Status final ==="
echo "   Acesse via subdomínio após reiniciar containers:"
echo "   Web: http://orffia.srv1110963.hstgr.cloud"
echo "   API: http://api-orffia.srv1110963.hstgr.cloud/health"
echo ""
echo "   Ou via IP direto (fallback):"
echo "   Web: http://164.163.195.86:4001"
echo "   API: http://164.163.195.86:4000/health"
echo ""
echo "   Para reiniciar containers com nova config:"
echo "   cd /opt/orffia && docker compose -f infra/compose/docker-compose.prod.yml up -d"
