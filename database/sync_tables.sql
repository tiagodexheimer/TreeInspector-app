-- Tabelas para Sistema de Sincronização
-- TreeInspector - Sincronização de Dados

-- Tabela de sessões de sincronização
CREATE TABLE IF NOT EXISTS sync_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    sync_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    uploaded_trees INTEGER DEFAULT 0,
    uploaded_inspections INTEGER DEFAULT 0,
    uploaded_photos INTEGER DEFAULT 0,
    downloaded_trees INTEGER DEFAULT 0,
    downloaded_inspections INTEGER DEFAULT 0,
    downloaded_photos INTEGER DEFAULT 0,
    conflicts_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de conflitos de sincronização
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- 'tree', 'inspection', 'photo'
    mobile_id VARCHAR(255),
    server_id INTEGER,
    conflict_reason TEXT,
    conflict_data JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
    resolution VARCHAR(50), -- 'keep_server', 'keep_mobile', 'merge'
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas de sincronização às tabelas existentes
-- Árvores
ALTER TABLE trees ADD COLUMN IF NOT EXISTS mobile_id VARCHAR(255);
ALTER TABLE trees ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT FALSE;
ALTER TABLE trees ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE trees ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Inspeções
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS mobile_id VARCHAR(255);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT FALSE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Fotos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS mobile_id VARCHAR(255);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT FALSE;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Espécies
ALTER TABLE species ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT FALSE;
ALTER TABLE species ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Índices para otimização de sincronização
CREATE INDEX IF NOT EXISTS idx_trees_mobile_id ON trees(mobile_id);
CREATE INDEX IF NOT EXISTS idx_trees_synced ON trees(synced);
CREATE INDEX IF NOT EXISTS idx_trees_updated_at ON trees(updated_at);

CREATE INDEX IF NOT EXISTS idx_inspections_mobile_id ON inspections(mobile_id);
CREATE INDEX IF NOT EXISTS idx_inspections_synced ON inspections(synced);
CREATE INDEX IF NOT EXISTS idx_inspections_updated_at ON inspections(updated_at);

CREATE INDEX IF NOT EXISTS idx_photos_mobile_id ON photos(mobile_id);
CREATE INDEX IF NOT EXISTS idx_photos_synced ON photos(synced);
CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON photos(file_hash);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_user_device ON sync_sessions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_timestamp ON sync_sessions(sync_timestamp);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user_device ON sync_conflicts(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status);

-- Triggers para atualizar sync_version automaticamente
CREATE OR REPLACE FUNCTION update_sync_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sync_version = OLD.sync_version + 1;
    NEW.last_sync_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS trees_sync_version_trigger ON trees;
CREATE TRIGGER trees_sync_version_trigger
    BEFORE UPDATE ON trees
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_version();

DROP TRIGGER IF EXISTS inspections_sync_version_trigger ON inspections;
CREATE TRIGGER inspections_sync_version_trigger
    BEFORE UPDATE ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_version();

DROP TRIGGER IF EXISTS photos_sync_version_trigger ON photos;
CREATE TRIGGER photos_sync_version_trigger
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_version();

-- View para estatísticas de sincronização
CREATE OR REPLACE VIEW sync_statistics AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    COUNT(DISTINCT ss.device_id) as devices_count,
    COUNT(ss.id) as total_syncs,
    MAX(ss.sync_timestamp) as last_sync,
    SUM(ss.uploaded_trees) as total_uploaded_trees,
    SUM(ss.uploaded_inspections) as total_uploaded_inspections,
    SUM(ss.uploaded_photos) as total_uploaded_photos,
    SUM(ss.conflicts_count) as total_conflicts,
    AVG(CASE WHEN ss.status = 'completed' THEN 1 ELSE 0 END) as success_rate
FROM users u
LEFT JOIN sync_sessions ss ON u.id = ss.user_id
GROUP BY u.id, u.name;

-- View para dados pendentes de sincronização
CREATE OR REPLACE VIEW pending_sync_data AS
SELECT 
    'trees' as table_name,
    COUNT(*) as pending_count,
    created_by as user_id
FROM trees 
WHERE synced = FALSE OR synced IS NULL
GROUP BY created_by

UNION ALL

SELECT 
    'inspections' as table_name,
    COUNT(*) as pending_count,
    created_by as user_id
FROM inspections 
WHERE synced = FALSE OR synced IS NULL
GROUP BY created_by

UNION ALL

SELECT 
    'photos' as table_name,
    COUNT(*) as pending_count,
    created_by as user_id
FROM photos 
WHERE synced = FALSE OR synced IS NULL
GROUP BY created_by;

-- Função para limpeza de dados antigos de sincronização
CREATE OR REPLACE FUNCTION cleanup_old_sync_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remover sessões antigas
    DELETE FROM sync_sessions 
    WHERE sync_timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Remover conflitos resolvidos antigos
    DELETE FROM sync_conflicts 
    WHERE status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas
COMMENT ON TABLE sync_sessions IS 'Registro de sessões de sincronização entre dispositivos móveis e servidor';
COMMENT ON TABLE sync_conflicts IS 'Conflitos de sincronização que requerem resolução manual';

COMMENT ON COLUMN trees.mobile_id IS 'ID único da árvore no dispositivo móvel';
COMMENT ON COLUMN trees.synced IS 'Indica se os dados foram sincronizados com o servidor';
COMMENT ON COLUMN trees.sync_version IS 'Versão dos dados para controle de conflitos';

COMMENT ON COLUMN inspections.mobile_id IS 'ID único da inspeção no dispositivo móvel';
COMMENT ON COLUMN inspections.synced IS 'Indica se os dados foram sincronizados com o servidor';

COMMENT ON COLUMN photos.mobile_id IS 'ID único da foto no dispositivo móvel';
COMMENT ON COLUMN photos.file_hash IS 'Hash SHA-256 do arquivo para detecção de duplicatas';
COMMENT ON COLUMN photos.synced IS 'Indica se os dados foram sincronizados com o servidor';