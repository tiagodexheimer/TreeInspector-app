-- Script de inicialização do banco de dados TreeInspector
-- Este script é executado automaticamente pelo Docker

-- Criar usuário e banco se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'treeinspector') THEN
        CREATE ROLE treeinspector WITH LOGIN PASSWORD 'treeinspector123';
    END IF;
END
$$;

-- Garantir que o usuário tenha as permissões necessárias
ALTER USER treeinspector CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE treeinspector TO treeinspector;

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Configurações de performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Recarregar configurações
SELECT pg_reload_conf();

-- Criar schema se não existir
CREATE SCHEMA IF NOT EXISTS public;

-- Garantir permissões no schema
GRANT ALL ON SCHEMA public TO treeinspector;
GRANT ALL ON ALL TABLES IN SCHEMA public TO treeinspector;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO treeinspector;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO treeinspector;

-- Configurar search_path
ALTER DATABASE treeinspector SET search_path TO public, postgis;

-- Log de inicialização
DO $$
BEGIN
    RAISE NOTICE 'TreeInspector database initialized successfully';
    RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
    RAISE NOTICE 'PostgreSQL version: %', version();
END
$$;