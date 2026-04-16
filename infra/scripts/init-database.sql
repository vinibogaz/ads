-- Synthex Database Initialization Script
-- Para executar no PostgreSQL 15 existente no VPS

-- 1. Criar database
CREATE DATABASE synthex;

-- 2. Criar usuário da aplicação
CREATE USER synthex_app WITH PASSWORD 'CHANGE_THIS_PASSWORD';

-- 3. Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE synthex TO synthex_app;

-- 4. Conectar ao database synthex
\c synthex

-- 5. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector para embeddings AI
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram para full-text search

-- 6. Conceder permissões ao synthex_app no schema public
GRANT ALL ON SCHEMA public TO synthex_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO synthex_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO synthex_app;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO synthex_app;

-- 7. Configurar permissões padrão para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO synthex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO synthex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO synthex_app;

-- Pronto! O Drizzle ORM rodará as migrations automaticamente no primeiro boot.
