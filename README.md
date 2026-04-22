# Orffia Ads — Plataforma de Mídia Paga

Plataforma SaaS modular de inteligência de marketing: SEO, GEO, Ads, CRO, Growth.

## Deploy em 5 minutos (VPS)

### Pré-requisitos

- VPS Ubuntu 24.04 com Docker e Docker Compose
- PostgreSQL 15 rodando (porta 5432)
- Acesso SSH ao VPS

### Passo a passo (copiar e colar)

**1. Criar database no PostgreSQL existente**

```bash
docker exec -i $(docker ps -q -f name=postgres) psql -U evolution << 'EOF'
CREATE DATABASE orffia;
\c orffia
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOF
```

**Nota:** Usando user `evolution` existente no VPS (senha: `evolution123`).

**2. Clonar repositório no VPS**

```bash
cd /opt
git clone https://github.com/vinibogaz/ads.git orffia
cd orffia
```

**3. Configurar variáveis de ambiente**

```bash
cp .env.example .env
nano .env  # Editar os valores (JWT secrets, API keys, DATABASE_URL)
```

**4. Subir aplicação (build + deploy)**

```bash
cd infra/compose
docker compose -p orffia -f docker-compose.prod.yml up -d --build
```

**Nota:** O `--build` constrói as imagens Docker localmente (API, Web, AI Worker).

**5. Configurar Nginx reverse proxy (opcional, se quiser domínio)**

```bash
sudo cp ../nginx/orffia-vhost.conf /etc/nginx/sites-available/orffia
sudo ln -s /etc/nginx/sites-available/orffia /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Pronto!** A aplicação estará rodando:
- API: `http://SEU_VPS_IP:4000`
- Web: `http://SEU_VPS_IP:4001`

Se configurou Nginx com domínio: `https://seudominio.com`

---

## Estrutura do Projeto

```
orffia/
├── apps/
│   ├── api/          # Fastify API (Node.js 20, TypeScript)
│   ├── web/          # Next.js 14 App Router (frontend)
│   └── ai-worker/    # FastAPI Python (geração de conteúdo AI)
├── packages/
│   ├── shared/       # Tipos TypeScript compartilhados
│   ├── db/           # Drizzle ORM + schema PostgreSQL
│   └── ui/           # Orffia Ads Design System (componentes React)
├── infra/
│   ├── compose/      # Docker Compose (dev + prod)
│   ├── docker/       # Dockerfiles
│   ├── nginx/        # Configs Nginx
│   └── scripts/      # Scripts de setup e backup
└── .github/workflows/ # CI/CD GitHub Actions
```

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Subir infra local (PostgreSQL + Redis)
cd infra/compose
docker compose -f docker-compose.dev.yml up -d

# Copiar .env
cp .env.example .env

# Rodar migrations
npm run db:migrate

# Dev mode (Turborepo)
npm run dev
```

Acessar:
- Web: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/docs

## Stack Técnica

**Frontend:**
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS (utilities only)
- Framer Motion
- Zustand + React Query

**Backend:**
- Node.js 20 LTS, Fastify (TypeScript)
- Drizzle ORM
- Redis 7

**AI Worker:**
- Python 3.12+, FastAPI
- OpenAI GPT-4o / Claude 3.5 Sonnet

**Database:**
- PostgreSQL 16 + pgvector
- Typesense (self-hosted)

**Infra:**
- AWS EC2 (sa-east-1)
- Docker + Docker Compose
- GitHub Actions CI/CD

## Arquitetura

- **Multi-tenant**: Row-Level Security (RLS) no PostgreSQL
- **Segurança**: JWT (15min access + 7d refresh com rotação), RBAC, TLS 1.3, audit logs
- **LGPD**: consent, DSAR, exclusão de conta
- **Performance**: TTI <2s, LCP <2.5s, CLS <0.1

## Documentação

- **API Docs**: Swagger em `/docs` (produção desabilitado)
- **Design System**: Storybook em `packages/ui` (futuro)
- **DB Schema**: `packages/db/src/schema/`

## Suporte

- Issues: GitHub Issues
- Fundador: [contato]
