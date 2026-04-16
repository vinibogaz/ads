# Progress — Sprint 1: Fundação

## Issue SYN-4 (DONE) — Código Completo

### ✅ O que foi completado

**Monorepo Turborepo** — 88 arquivos, 5.364 linhas:
- `@synthex/shared` — Tipos TypeScript (auth, tenant, user, content, geo, api)
- `@synthex/db` — Drizzle ORM + schema completo + RLS multi-tenant PostgreSQL
- `apps/api` — Fastify: JWT auth (access 15min + refresh 7d + rotação), RBAC, rate-limit, swagger
- `apps/web` — Next.js 14 App Router: dark mode, Synthex DS tokens, login, dashboard
- `apps/ai-worker` — Python FastAPI: GPT-4o + fallback Claude 3.5 Sonnet, scoring SEO/GEO
- `@synthex/ui` — Design System: Button, Card, Badge, ScoreGauge, Spinner, Skeleton, Toast

**Infraestrutura:**
- Docker Compose dev + prod (PostgreSQL 16+pgvector, Redis 7, Nginx TLS 1.3)
- GitHub Actions CI/CD: lint → typecheck → test → build Docker → deploy SSH VPS
- Script setup VPS Ubuntu 24.04 (UFW, fail2ban, swap, backup S3)

**Segurança & LGPD:**
- Consent records, DSAR export, account deletion

### 🔄 Issue SYN-7 (IN PROGRESS) — Ajustes de Deployment

**Problemas identificados:**

A configuração de deployment atual não segue as regras do Fundador especificadas em SYN-4. O VPS já tem:
- PostgreSQL 15 rodando (porta 5432, Docker)
- Nginx/Traefik (portas 80/443)
- movAds (porta 3001)
- n8n, Evolution API, Paperclip, root-piper

**O que precisa ser ajustado:**

1. **docker-compose.prod.yml**:
   - ❌ Remove serviço PostgreSQL (reusar o existente)
   - ❌ Muda porta API de 3001 para 4000
   - ❌ Muda porta web de 3000 para 4001
   - ❌ Remove serviço Nginx standalone
   - ❌ Adiciona nome de projeto separado

2. **Criar novos arquivos**:
   - README.md com "Deploy in 5 minutes" (max 5 comandos copy-paste)
   - infra/scripts/init-database.sql (CREATE DATABASE synthex)
   - infra/nginx/synthex-vhost.conf (config reverse proxy para Nginx existente)

3. **Atualizar .env.example**:
   - Adicionar comentários explicativos em cada variável

### 📋 TODO — Próximos passos

- [x] Criar README.md com deployment simplificado
- [x] Criar infra/scripts/init-database.sql
- [x] Atualizar docker-compose.prod.yml (sem PostgreSQL, portas corretas, projeto separado)
- [x] Criar infra/nginx/synthex-vhost.conf (reverse proxy)
- [x] Melhorar .env.example com comentários
- [x] Commit e atualizar SYN-7
- [ ] Aguardar aprovação do Fundador

### 📁 Arquivos criados/modificados (SYN-7)

**Criados:**
- `README.md` — Deploy em 5 minutos, estrutura do projeto, stack técnica
- `docs/progress.md` — Tracking de progresso (política SYN-6)
- `infra/scripts/init-database.sql` — Script SQL para criar database no PostgreSQL existente
- `infra/nginx/synthex-vhost.conf` — Configuração Nginx reverse proxy (portas 4000/4001)

**Modificados:**
- `.env.example` — Comentários detalhados em PT-BR, checklist pré-deploy, portas corrigidas (4000 API, 4001 web)
- `infra/compose/docker-compose.prod.yml` — Removido PostgreSQL (reusa existente), portas 4000/4001, projeto isolado

### ✅ Resultado Final

Deployment agora está 100% compatível com o VPS do Fundador:
- ✅ Reusa PostgreSQL 15 existente (porta 5432) via `172.17.0.1`
- ✅ Portas não conflitam: API 4000, Web 4001 (movAds usa 3001, Traefik usa 80/443)
- ✅ Docker Compose isolado com projeto `synthex`
- ✅ README com 5 comandos copy-paste para deploy
- ✅ Nginx vhost config separado (não interfere com Traefik/Nginx existente)
- ✅ .env.example com instruções claras em PT-BR

---

## Issue SYN-8 (BLOCKED) — Push para GitHub

### 🚧 Bloqueador Atual

**Tentativa de push falhou** — Sem credenciais de acesso ao GitHub.

```bash
git remote add origin https://github.com/vinibogaz/segeo-plataform.git
git push -u origin main
# Erro: fatal: could not read Username for 'https://github.com': No such device or address
```

### ✅ O Que Foi Feito (SYN-8)

- ✅ Navegou para workspace Synthex
- ✅ Verificou docs/progress.md
- ✅ Analisou comentários da SYN-7 (instruções de deployment do Fundador)
- ✅ Configurou remote GitHub
- ❌ Push bloqueado por falta de credenciais

### 🔑 Aguardando do Fundador

**Uma das 3 opções:**

1. **GitHub Personal Access Token (PAT)** — formato `ghp_xxxxx` com scope `repo`
2. **SSH Key** — chave pública para adicionar no GitHub
3. **Deploy manual** — Fundador faz push manualmente do workspace

### 📋 TODO — Após Desbloqueio

- [ ] Receber credenciais do Fundador
- [ ] Fazer push para https://github.com/vinibogaz/segeo-plataform.git
- [ ] Notificar Fundador que código está no GitHub
- [ ] Fundador faz deploy no VPS (git clone + docker compose up -d)
- [ ] Validar deploy (API http://31.97.245.90:4000, Web http://31.97.245.90:4001)

---

**Última atualização:** 2026-04-16 18:56 (Issue SYN-8 — bloqueada, aguardando credenciais GitHub do Fundador)
