-- TreeInspector Database Schema
-- PostgreSQL with PostGIS Extension
-- Modelo de Dados Temporal/Bitemporal

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================
-- TABELAS PRINCIPAIS
-- ==============================================

-- Tabela de usuários
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(20) NOT NULL DEFAULT 'inspetor' CHECK (papel IN ('admin', 'inspetor', 'visualizador')),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON usuarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para usuários
CREATE INDEX idx_usuarios_email ON usuarios (email);
CREATE INDEX idx_usuarios_papel ON usuarios (papel);
CREATE INDEX idx_usuarios_ativo ON usuarios (ativo);

-- Tabela de espécies
CREATE TABLE especies (
    id_especie SERIAL PRIMARY KEY,
    nome_comum VARCHAR(100) NOT NULL,
    nome_cientifico VARCHAR(100) UNIQUE NOT NULL,
    familia VARCHAR(100),
    gbif_id BIGINT,
    plantnet_id VARCHAR(50),
    nativa BOOLEAN,
    porte_tipico VARCHAR(20) CHECK (porte_tipico IN ('pequeno', 'medio', 'grande')),
    informacoes_gbif JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_especies_updated_at 
    BEFORE UPDATE ON especies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para espécies
CREATE INDEX idx_especies_nome_comum ON especies (nome_comum);
CREATE INDEX idx_especies_nome_cientifico ON especies (nome_cientifico);
CREATE INDEX idx_especies_familia ON especies (familia);
CREATE INDEX idx_especies_nativa ON especies (nativa);
CREATE INDEX idx_especies_gbif_id ON especies (gbif_id);

-- Índices de busca textual
CREATE INDEX idx_especies_nome_comum_gin ON especies USING GIN (to_tsvector('portuguese', nome_comum));
CREATE INDEX idx_especies_nome_cientifico_gin ON especies USING GIN (to_tsvector('portuguese', nome_cientifico));

-- Tabela de árvores
CREATE TABLE arvores (
    id_arvore SERIAL PRIMARY KEY,
    numero_etiqueta VARCHAR(50),
    localizacao GEOMETRY(Point, 4326) NOT NULL,
    endereco VARCHAR(255),
    ponto_referencia VARCHAR(255),
    id_especie INTEGER REFERENCES especies(id_especie),
    contagem_agrupamento INTEGER DEFAULT 1,
    id_usuario_criador INTEGER REFERENCES usuarios(id_usuario),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_arvores_updated_at 
    BEFORE UPDATE ON arvores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices espaciais e regulares para árvores
CREATE INDEX idx_arvores_localizacao ON arvores USING GIST (localizacao);
CREATE INDEX idx_arvores_especie ON arvores (id_especie);
CREATE INDEX idx_arvores_numero_etiqueta ON arvores (numero_etiqueta);
CREATE INDEX idx_arvores_usuario_criador ON arvores (id_usuario_criador);

-- Tabela de inspeções
CREATE TABLE inspecoes (
    id_inspecao SERIAL PRIMARY KEY,
    id_arvore INTEGER NOT NULL REFERENCES arvores(id_arvore),
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    data_inspecao TIMESTAMP WITH TIME ZONE NOT NULL,
    observacoes_gerais TEXT,
    clima VARCHAR(50),
    temperatura NUMERIC(4,1),
    sincronizado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_inspecoes_updated_at 
    BEFORE UPDATE ON inspecoes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para inspeções
CREATE INDEX idx_inspecoes_arvore ON inspecoes (id_arvore);
CREATE INDEX idx_inspecoes_usuario ON inspecoes (id_usuario);
CREATE INDEX idx_inspecoes_data ON inspecoes (data_inspecao);
CREATE INDEX idx_inspecoes_sincronizado ON inspecoes (sincronizado);

-- ==============================================
-- TABELAS TEMPORAIS
-- ==============================================

-- Função para atualizar registros temporais
CREATE OR REPLACE FUNCTION update_temporal_record()
RETURNS TRIGGER AS $$
BEGIN
    -- Finaliza registros anteriores da mesma inspeção
    UPDATE dados_dendrometricos 
    SET valid_to = NEW.valid_from, tx_end = NOW()
    WHERE id_inspecao = NEW.id_inspecao 
    AND valid_to = 'infinity'::timestamp 
    AND id_dado != NEW.id_dado;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de dados dendrométricos (temporal)
CREATE TABLE dados_dendrometricos (
    id_dado SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    dap_cm NUMERIC(10, 2) NOT NULL,
    altura_total_m NUMERIC(10, 2) NOT NULL,
    altura_copa_m NUMERIC(10, 2) NOT NULL,
    diametro_copa_m NUMERIC(10, 2),
    metodo_medicao VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (metodo_medicao IN ('manual', 'estimado_ar')),
    precisao_estimada NUMERIC(5, 2),
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger temporal para dados dendrométricos
CREATE TRIGGER trg_dados_dendrometricos_temporal
    BEFORE INSERT ON dados_dendrometricos
    FOR EACH ROW EXECUTE FUNCTION update_temporal_record();

-- Índices para dados dendrométricos
CREATE INDEX idx_dados_dendrometricos_inspecao ON dados_dendrometricos (id_inspecao);
CREATE INDEX idx_dados_dendrometricos_valid ON dados_dendrometricos (valid_from, valid_to);
CREATE INDEX idx_dados_dendrometricos_temporal ON dados_dendrometricos (valid_from, valid_to, tx_start, tx_end);

-- Tabela de dados fitossanitários (temporal)
CREATE TABLE dados_fitossanitarios (
    id_dado SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    estado_saude VARCHAR(50) NOT NULL CHECK (estado_saude IN ('otimo', 'bom', 'regular', 'ruim', 'critico')),
    problemas_observados JSONB,
    severidade_problemas VARCHAR(20) CHECK (severidade_problemas IN ('leve', 'moderada', 'severa')),
    observacoes_detalhadas TEXT,
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger temporal para dados fitossanitários
CREATE TRIGGER trg_dados_fitossanitarios_temporal
    BEFORE INSERT ON dados_fitossanitarios
    FOR EACH ROW EXECUTE FUNCTION update_temporal_record();

-- Índices para dados fitossanitários
CREATE INDEX idx_dados_fitossanitarios_inspecao ON dados_fitossanitarios (id_inspecao);
CREATE INDEX idx_dados_fitossanitarios_valid ON dados_fitossanitarios (valid_from, valid_to);
CREATE INDEX idx_dados_fitossanitarios_estado ON dados_fitossanitarios (estado_saude);
CREATE INDEX idx_dados_fitossanitarios_temporal ON dados_fitossanitarios (valid_from, valid_to, tx_start, tx_end);

-- Tabela de dados do entorno (temporal)
CREATE TABLE dados_entorno (
    id_dado SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    largura_calcada_m NUMERIC(10, 2),
    tipo_calcada VARCHAR(50) CHECK (tipo_calcada IN ('concreto', 'pedra', 'terra', 'asfalto', 'outro')),
    redes_proximas JSONB,
    distancia_redes_m NUMERIC(10, 2),
    uso_solo VARCHAR(50) CHECK (uso_solo IN ('residencial', 'comercial', 'industrial', 'misto', 'publico')),
    barreiras_fisicas JSONB,
    espaco_disponivel VARCHAR(20) CHECK (espaco_disponivel IN ('adequado', 'limitado', 'insuficiente')),
    conflitos_infraestrutura JSONB,
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger temporal para dados do entorno
CREATE TRIGGER trg_dados_entorno_temporal
    BEFORE INSERT ON dados_entorno
    FOR EACH ROW EXECUTE FUNCTION update_temporal_record();

-- Índices para dados do entorno
CREATE INDEX idx_dados_entorno_inspecao ON dados_entorno (id_inspecao);
CREATE INDEX idx_dados_entorno_valid ON dados_entorno (valid_from, valid_to);
CREATE INDEX idx_dados_entorno_temporal ON dados_entorno (valid_from, valid_to, tx_start, tx_end);

-- Tabela de avaliações de risco (temporal)
CREATE TABLE avaliacoes_risco (
    id_avaliacao SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    nivel_avaliacao INTEGER NOT NULL CHECK (nivel_avaliacao IN (1, 2, 3)),
    categoria_risco VARCHAR(20) NOT NULL CHECK (categoria_risco IN ('baixo', 'moderado', 'alto', 'extremo')),
    pontuacao_risco INTEGER,
    
    -- Fatores de risco (conforme ABNT NBR 16246-3)
    defeitos_estruturais JSONB,
    condicao_raizes VARCHAR(20) CHECK (condicao_raizes IN ('boa', 'regular', 'ruim', 'critica')),
    condicao_tronco VARCHAR(20) CHECK (condicao_tronco IN ('boa', 'regular', 'ruim', 'critica')),
    condicao_copa VARCHAR(20) CHECK (condicao_copa IN ('boa', 'regular', 'ruim', 'critica')),
    historico_quedas BOOLEAN DEFAULT false,
    proximidade_alvos VARCHAR(20) CHECK (proximidade_alvos IN ('baixa', 'media', 'alta')),
    
    -- Dados de instrumentos avançados (Nível 3)
    tomografia_dados JSONB,
    penetrometria_dados JSONB,
    outros_instrumentos JSONB,
    
    recomendacoes TEXT,
    urgencia_acao VARCHAR(20) CHECK (urgencia_acao IN ('baixa', 'media', 'alta', 'emergencial')),
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger temporal para avaliações de risco
CREATE TRIGGER trg_avaliacoes_risco_temporal
    BEFORE INSERT ON avaliacoes_risco
    FOR EACH ROW EXECUTE FUNCTION update_temporal_record();

-- Índices para avaliações de risco
CREATE INDEX idx_avaliacoes_risco_inspecao ON avaliacoes_risco (id_inspecao);
CREATE INDEX idx_avaliacoes_risco_valid ON avaliacoes_risco (valid_from, valid_to);
CREATE INDEX idx_avaliacoes_risco_categoria ON avaliacoes_risco (categoria_risco);
CREATE INDEX idx_avaliacoes_risco_urgencia ON avaliacoes_risco (urgencia_acao);
CREATE INDEX idx_avaliacoes_risco_temporal ON avaliacoes_risco (valid_from, valid_to, tx_start, tx_end);

-- ==============================================
-- TABELAS COMPLEMENTARES
-- ==============================================

-- Tabela de ações de manejo
CREATE TABLE acoes_manejo (
    id_acao SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    acao_proposta VARCHAR(100) NOT NULL,
    nivel_urgencia VARCHAR(20) NOT NULL CHECK (nivel_urgencia IN ('baixa', 'media', 'alta', 'emergencial')),
    justificativa TEXT,
    especie_substituicao VARCHAR(100),
    recomendacoes_plantio TEXT,
    custo_estimado NUMERIC(10, 2),
    prazo_execucao_dias INTEGER,
    executado BOOLEAN DEFAULT false,
    data_execucao TIMESTAMP WITH TIME ZONE,
    observacoes_execucao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_acoes_manejo_updated_at 
    BEFORE UPDATE ON acoes_manejo 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para ações de manejo
CREATE INDEX idx_acoes_manejo_inspecao ON acoes_manejo (id_inspecao);
CREATE INDEX idx_acoes_manejo_urgencia ON acoes_manejo (nivel_urgencia);
CREATE INDEX idx_acoes_manejo_executado ON acoes_manejo (executado);

-- Tabela de fotos
CREATE TABLE fotos (
    id_foto SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    caminho_arquivo VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255),
    tipo_foto VARCHAR(50) CHECK (tipo_foto IN ('geral', 'tronco', 'copa', 'raizes', 'problema_especifico', 'entorno')),
    descricao TEXT,
    localizacao_gps GEOMETRY(Point, 4326),
    timestamp_foto TIMESTAMP WITH TIME ZONE NOT NULL,
    tamanho_arquivo BIGINT,
    hash_arquivo VARCHAR(64),
    sincronizado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para fotos
CREATE INDEX idx_fotos_inspecao ON fotos (id_inspecao);
CREATE INDEX idx_fotos_tipo ON fotos (tipo_foto);
CREATE INDEX idx_fotos_timestamp ON fotos (timestamp_foto);
CREATE INDEX idx_fotos_sincronizado ON fotos (sincronizado);
CREATE INDEX idx_fotos_localizacao ON fotos USING GIST (localizacao_gps);

-- Tabela de relatórios
CREATE TABLE relatorios (
    id_relatorio SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('arvores', 'inspecoes', 'manejo', 'personalizado')),
    filtros JSONB,
    formato VARCHAR(10) NOT NULL CHECK (formato IN ('pdf', 'csv', 'xlsx')),
    caminho_arquivo VARCHAR(255),
    status VARCHAR(20) DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    tamanho_arquivo BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para relatórios
CREATE INDEX idx_relatorios_usuario ON relatorios (id_usuario);
CREATE INDEX idx_relatorios_tipo ON relatorios (tipo);
CREATE INDEX idx_relatorios_status ON relatorios (status);
CREATE INDEX idx_relatorios_data_geracao ON relatorios (data_geracao);

-- Tabela de log de sincronização
CREATE TABLE sync_log (
    id_sync SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    dispositivo_id VARCHAR(100),
    tipo_operacao VARCHAR(20) NOT NULL CHECK (tipo_operacao IN ('upload', 'download')),
    tabela_afetada VARCHAR(50),
    registros_processados INTEGER DEFAULT 0,
    registros_erro INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'iniciado' CHECK (status IN ('iniciado', 'concluido', 'erro')),
    detalhes_erro TEXT,
    timestamp_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp_fim TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para sync_log
CREATE INDEX idx_sync_log_usuario ON sync_log (id_usuario);
CREATE INDEX idx_sync_log_dispositivo ON sync_log (dispositivo_id);
CREATE INDEX idx_sync_log_timestamp ON sync_log (timestamp_inicio);
CREATE INDEX idx_sync_log_status ON sync_log (status);

-- ==============================================
-- VIEWS PARA CONSULTAS OTIMIZADAS
-- ==============================================

-- View: Estado atual das árvores
CREATE VIEW v_arvores_estado_atual AS
SELECT 
    a.id_arvore,
    a.numero_etiqueta,
    a.localizacao,
    a.endereco,
    a.ponto_referencia,
    e.nome_comum,
    e.nome_cientifico,
    e.familia,
    e.nativa,
    dd.dap_cm,
    dd.altura_total_m,
    dd.altura_copa_m,
    df.estado_saude,
    ar.categoria_risco,
    ar.urgencia_acao,
    i.data_inspecao AS ultima_inspecao,
    u.nome AS ultimo_inspetor,
    a.created_at,
    a.updated_at
FROM arvores a
LEFT JOIN especies e ON a.id_especie = e.id_especie
LEFT JOIN LATERAL (
    SELECT * FROM inspecoes i2 
    WHERE i2.id_arvore = a.id_arvore 
    ORDER BY i2.data_inspecao DESC 
    LIMIT 1
) i ON true
LEFT JOIN usuarios u ON i.id_usuario = u.id_usuario
LEFT JOIN dados_dendrometricos dd ON i.id_inspecao = dd.id_inspecao 
    AND dd.valid_to = 'infinity'
LEFT JOIN dados_fitossanitarios df ON i.id_inspecao = df.id_inspecao 
    AND df.valid_to = 'infinity'
LEFT JOIN avaliacoes_risco ar ON i.id_inspecao = ar.id_inspecao 
    AND ar.valid_to = 'infinity';

-- View: Histórico completo por árvore
CREATE VIEW v_historico_arvore AS
SELECT 
    a.id_arvore,
    a.numero_etiqueta,
    i.id_inspecao,
    i.data_inspecao,
    u.nome AS inspetor,
    dd.dap_cm,
    dd.altura_total_m,
    dd.altura_copa_m,
    df.estado_saude,
    ar.categoria_risco,
    ar.pontuacao_risco,
    dd.valid_from,
    dd.valid_to,
    i.created_at
FROM arvores a
JOIN inspecoes i ON a.id_arvore = i.id_arvore
JOIN usuarios u ON i.id_usuario = u.id_usuario
LEFT JOIN dados_dendrometricos dd ON i.id_inspecao = dd.id_inspecao
LEFT JOIN dados_fitossanitarios df ON i.id_inspecao = df.id_inspecao
LEFT JOIN avaliacoes_risco ar ON i.id_inspecao = ar.id_inspecao
ORDER BY a.id_arvore, i.data_inspecao;

-- View: Estatísticas por espécie
CREATE VIEW v_estatisticas_especies AS
SELECT 
    e.id_especie,
    e.nome_comum,
    e.nome_cientifico,
    e.familia,
    e.nativa,
    COUNT(a.id_arvore) as total_arvores,
    AVG(dd.dap_cm) as dap_medio,
    AVG(dd.altura_total_m) as altura_media,
    COUNT(CASE WHEN df.estado_saude = 'critico' THEN 1 END) as arvores_criticas,
    COUNT(CASE WHEN ar.categoria_risco = 'alto' THEN 1 END) as arvores_alto_risco,
    COUNT(CASE WHEN ar.categoria_risco = 'extremo' THEN 1 END) as arvores_risco_extremo
FROM especies e
LEFT JOIN arvores a ON e.id_especie = a.id_especie
LEFT JOIN v_arvores_estado_atual v ON a.id_arvore = v.id_arvore
LEFT JOIN dados_dendrometricos dd ON dd.valid_to = 'infinity'
LEFT JOIN dados_fitossanitarios df ON df.valid_to = 'infinity'
LEFT JOIN avaliacoes_risco ar ON ar.valid_to = 'infinity'
GROUP BY e.id_especie, e.nome_comum, e.nome_cientifico, e.familia, e.nativa
ORDER BY total_arvores DESC;

-- View: Ações pendentes por urgência
CREATE VIEW v_acoes_pendentes AS
SELECT 
    am.id_acao,
    a.id_arvore,
    a.numero_etiqueta,
    a.endereco,
    e.nome_comum,
    am.acao_proposta,
    am.nivel_urgencia,
    am.justificativa,
    am.custo_estimado,
    am.prazo_execucao_dias,
    i.data_inspecao,
    u.nome AS inspetor,
    am.created_at
FROM acoes_manejo am
JOIN inspecoes i ON am.id_inspecao = i.id_inspecao
JOIN arvores a ON i.id_arvore = a.id_arvore
JOIN usuarios u ON i.id_usuario = u.id_usuario
LEFT JOIN especies e ON a.id_especie = e.id_especie
WHERE am.executado = false
ORDER BY 
    CASE am.nivel_urgencia 
        WHEN 'emergencial' THEN 1 
        WHEN 'alta' THEN 2 
        WHEN 'media' THEN 3
        WHEN 'baixa' THEN 4
    END,
    i.data_inspecao DESC;

-- ==============================================
-- FUNÇÕES AUXILIARES
-- ==============================================

-- Função para calcular distância entre pontos
CREATE OR REPLACE FUNCTION calcular_distancia_arvores(
    lat1 DOUBLE PRECISION,
    lng1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_GeomFromText('POINT(' || lng1 || ' ' || lat1 || ')', 4326)::geography,
        ST_GeomFromText('POINT(' || lng2 || ' ' || lat2 || ')', 4326)::geography
    );
END;
$$ LANGUAGE plpgsql;

-- Função para buscar árvores em raio
CREATE OR REPLACE FUNCTION buscar_arvores_em_raio(
    centro_lat DOUBLE PRECISION,
    centro_lng DOUBLE PRECISION,
    raio_metros INTEGER
) RETURNS TABLE (
    id_arvore INTEGER,
    numero_etiqueta VARCHAR,
    endereco VARCHAR,
    distancia_metros DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id_arvore,
        a.numero_etiqueta,
        a.endereco,
        ST_Distance(
            a.localizacao::geography,
            ST_GeomFromText('POINT(' || centro_lng || ' ' || centro_lat || ')', 4326)::geography
        ) as distancia_metros
    FROM arvores a
    WHERE ST_DWithin(
        a.localizacao::geography,
        ST_GeomFromText('POINT(' || centro_lng || ' ' || centro_lat || ')', 4326)::geography,
        raio_metros
    )
    ORDER BY distancia_metros;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DADOS INICIAIS
-- ==============================================

-- Inserir usuário administrador padrão
INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES 
('Administrador', 'admin@treeinspector.com', '$2b$10$rQZ8kHWKtGkVQW8X9vQZ8eJ8kHWKtGkVQW8X9vQZ8eJ8kHWKtGkVQW', 'admin');

-- Inserir algumas espécies comuns brasileiras
INSERT INTO especies (nome_comum, nome_cientifico, familia, nativa, porte_tipico) VALUES 
('Ipê Amarelo', 'Handroanthus chrysotrichus', 'Bignoniaceae', true, 'grande'),
('Ipê Roxo', 'Handroanthus impetiginosus', 'Bignoniaceae', true, 'grande'),
('Pau-brasil', 'Paubrasilia echinata', 'Fabaceae', true, 'grande'),
('Sibipiruna', 'Poincianella pluviosa', 'Fabaceae', true, 'grande'),
('Quaresmeira', 'Tibouchina granulosa', 'Melastomataceae', true, 'medio'),
('Jacarandá-mimoso', 'Jacaranda mimosifolia', 'Bignoniaceae', false, 'grande'),
('Flamboyant', 'Delonix regia', 'Fabaceae', false, 'grande'),
('Ficus', 'Ficus benjamina', 'Moraceae', false, 'grande');

-- Comentários nas tabelas
COMMENT ON TABLE usuarios IS 'Usuários do sistema com diferentes papéis';
COMMENT ON TABLE especies IS 'Catálogo de espécies de árvores';
COMMENT ON TABLE arvores IS 'Registro das árvores cadastradas no sistema';
COMMENT ON TABLE inspecoes IS 'Inspeções realizadas nas árvores';
COMMENT ON TABLE dados_dendrometricos IS 'Dados de medição das árvores (temporal)';
COMMENT ON TABLE dados_fitossanitarios IS 'Estado de saúde das árvores (temporal)';
COMMENT ON TABLE dados_entorno IS 'Condições do entorno das árvores (temporal)';
COMMENT ON TABLE avaliacoes_risco IS 'Avaliações de risco conforme ABNT NBR 16246-3 (temporal)';
COMMENT ON TABLE acoes_manejo IS 'Ações de manejo recomendadas';
COMMENT ON TABLE fotos IS 'Fotos das inspeções';
COMMENT ON TABLE relatorios IS 'Relatórios gerados pelo sistema';
COMMENT ON TABLE sync_log IS 'Log de sincronização de dados';

-- Comentários nas views
COMMENT ON VIEW v_arvores_estado_atual IS 'Estado atual de todas as árvores com dados da última inspeção';
COMMENT ON VIEW v_historico_arvore IS 'Histórico completo de inspeções por árvore';
COMMENT ON VIEW v_estatisticas_especies IS 'Estatísticas agregadas por espécie';
COMMENT ON VIEW v_acoes_pendentes IS 'Ações de manejo pendentes ordenadas por urgência';