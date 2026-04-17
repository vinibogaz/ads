-- ORFFIA Database Initialization Script
-- Para executar no PostgreSQL 15 existente no VPS

-- 1. Criar database
CREATE DATABASE orffia;

-- 2. Criar usuário da aplicação
CREATE USER orffia_app WITH PASSWORD 'CHANGE_THIS_PASSWORD';

-- 3. Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE orffia TO orffia_app;

-- 4. Conectar ao database orffia
\c orffia

-- 5. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector para embeddings AI
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram para full-text search

-- 6. Conceder permissões ao orffia_app no schema public
GRANT ALL ON SCHEMA public TO orffia_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO orffia_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO orffia_app;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO orffia_app;

-- 7. Configurar permissões padrão para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO orffia_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO orffia_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO orffia_app;

-- Pronto! O Drizzle ORM rodará as migrations automaticamente no primeiro boot.
