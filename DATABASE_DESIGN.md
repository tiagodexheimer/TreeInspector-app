# Design do Banco de Dados - TreeInspector

## 🗄️ Modelo de Dados Temporal/Bitemporal

O TreeInspector implementa um modelo de dados **bitemporal** para preservar o histórico completo de todas as inspeções e mudanças nas árvores ao longo do tempo.

### Conceitos Temporais

#### Tempo Válido (Valid Time)
- `valid_from`: Data/hora em que o fato era verdadeiro no mundo real
- `valid_to`: Data/hora até quando o fato permaneceu verdadeiro

#### Tempo de Transação (Transaction Time)
- `tx_start`: Data/hora em que o registro foi inserido no banco
- `tx_end`: Data/hora em que o registro foi logicamente removido

## 📊 Schema Completo

### 1. Tabela: `usuarios`
```sql
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(20) NOT NULL DEFAULT 'inspetor', -- 'admin', 'inspetor', 'visualizador'
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Tabela: `especies`
```sql
CREATE TABLE especies (
    id_especie SERIAL PRIMARY KEY,
    nome_comum VARCHAR(100) NOT NULL,
    nome_cientifico VARCHAR(100) UNIQUE NOT NULL,
    familia VARCHAR(100),
    gbif_id BIGINT,
    plantnet_id VARCHAR(50),
    nativa BOOLEAN,
    porte_tipico VARCHAR(20), -- 'pequeno', 'medio', 'grande'
    informacoes_gbif JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Tabela: `arvores`
```sql
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

-- Índices espaciais
CREATE INDEX idx_arvores_localizacao ON arvores USING GIST (localizacao);
CREATE INDEX idx_arvores_especie ON arvores (id_especie);
```

### 4. Tabela: `inspecoes`
```sql
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

CREATE INDEX idx_inspecoes_arvore ON inspecoes (id_arvore);
CREATE INDEX idx_inspecoes_data ON inspecoes (data_inspecao);
```

### 5. Tabela: `dados_dendrometricos` (Temporal)
```sql
CREATE TABLE dados_dendrometricos (
    id_dado SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    dap_cm NUMERIC(10, 2) NOT NULL,
    altura_total_m NUMERIC(10, 2) NOT NULL,
    altura_copa_m NUMERIC(10, 2) NOT NULL,
    diametro_copa_m NUMERIC(10, 2),
    metodo_medicao VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual', 'estimado_ar'
    precisao_estimada NUMERIC(5, 2), -- percentual de precisão estimada
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dados_dendrometricos_inspecao ON dados_dendrometricos (id_inspecao);
CREATE INDEX idx_dados_dendrometricos_valid ON dados_dendrometricos (valid_from, valid_to);
```

### 6. Tabela: `dados_fitossanitarios` (Temporal)
```sql
CREATE TABLE dados_fitossanitarios (
    id_dado SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    estado_saude VARCHAR(50) NOT NULL, -- 'otimo', 'bom', 'regular', 'ruim', 'critico'
    problemas_observados JSONB, -- Array de problemas: ["pragas_cupins", "doencas_fungos", etc.]
    severidade_problemas VARCHAR(20), -- 'leve', 'moderada', 'severa'
    observacoes_detalhadas TEXT,
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dados_fitossanitarios_inspecao ON dados_fitossanitarios (id_inspecao);
CREATE INDEX idx_dados_fitossanitarios_valid ON dados_fitossanitarios (valid_from, valid_to);
CREATE INDEX idx_dados_fitossanitarios_estado ON dados_fitossanitarios (estado_saude);
```

### 7. Tabela: `dados_entorno` (Temporal)
```sql
CREATE TABLE dados_entorno (
    id_dado SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    largura_calcada_m NUMERIC(10, 2),
    tipo_calcada VARCHAR(50), -- 'concreto', 'pedra', 'terra', 'asfalto'
    redes_proximas JSONB, -- Array: ["eletrica", "telefonica", "agua", "esgoto", "gas"]
    distancia_redes_m NUMERIC(10, 2),
    uso_solo VARCHAR(50), -- 'residencial', 'comercial', 'industrial', 'misto'
    barreiras_fisicas JSONB, -- Array: ["muros", "construcoes", "outras"]
    espaco_disponivel VARCHAR(20), -- 'adequado', 'limitado', 'insuficiente'
    conflitos_infraestrutura JSONB,
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dados_entorno_inspecao ON dados_entorno (id_inspecao);
CREATE INDEX idx_dados_entorno_valid ON dados_entorno (valid_from, valid_to);
```

### 8. Tabela: `avaliacoes_risco` (Temporal)
```sql
CREATE TABLE avaliacoes_risco (
    id_avaliacao SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    nivel_avaliacao INTEGER NOT NULL, -- 1, 2, 3 (conforme ABNT NBR 16246-3)
    categoria_risco VARCHAR(20) NOT NULL, -- 'baixo', 'moderado', 'alto', 'extremo'
    pontuacao_risco INTEGER,
    
    -- Fatores de risco (conforme ABNT)
    defeitos_estruturais JSONB,
    condicao_raizes VARCHAR(20),
    condicao_tronco VARCHAR(20),
    condicao_copa VARCHAR(20),
    historico_quedas BOOLEAN DEFAULT false,
    proximidade_alvos VARCHAR(20), -- 'baixa', 'media', 'alta'
    
    -- Dados de instrumentos avançados (Nível 3)
    tomografia_dados JSONB,
    penetrometria_dados JSONB,
    outros_instrumentos JSONB,
    
    recomendacoes TEXT,
    urgencia_acao VARCHAR(20), -- 'baixa', 'media', 'alta', 'emergencial'
    
    -- Campos temporais
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    tx_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_end TIMESTAMP WITH TIME ZONE DEFAULT 'infinity',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_avaliacoes_risco_inspecao ON avaliacoes_risco (id_inspecao);
CREATE INDEX idx_avaliacoes_risco_valid ON avaliacoes_risco (valid_from, valid_to);
CREATE INDEX idx_avaliacoes_risco_categoria ON avaliacoes_risco (categoria_risco);
```

### 9. Tabela: `acoes_manejo`
```sql
CREATE TABLE acoes_manejo (
    id_acao SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    acao_proposta VARCHAR(100) NOT NULL, -- 'poda_limpeza', 'poda_elevacao', 'supressao', etc.
    nivel_urgencia VARCHAR(20) NOT NULL, -- 'baixa', 'media', 'alta', 'emergencial'
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

CREATE INDEX idx_acoes_manejo_inspecao ON acoes_manejo (id_inspecao);
CREATE INDEX idx_acoes_manejo_urgencia ON acoes_manejo (nivel_urgencia);
CREATE INDEX idx_acoes_manejo_executado ON acoes_manejo (executado);
```

### 10. Tabela: `fotos`
```sql
CREATE TABLE fotos (
    id_foto SERIAL PRIMARY KEY,
    id_inspecao INTEGER NOT NULL REFERENCES inspecoes(id_inspecao),
    caminho_arquivo VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255),
    tipo_foto VARCHAR(50), -- 'geral', 'tronco', 'copa', 'raizes', 'problema_especifico'
    descricao TEXT,
    localizacao_gps GEOMETRY(Point, 4326),
    timestamp_foto TIMESTAMP WITH TIME ZONE NOT NULL,
    tamanho_arquivo BIGINT,
    hash_arquivo VARCHAR(64), -- Para verificação de integridade
    sincronizado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fotos_inspecao ON fotos (id_inspecao);
CREATE INDEX idx_fotos_tipo ON fotos (tipo_foto);
CREATE INDEX idx_fotos_timestamp ON fotos (timestamp_foto);
```

### 11. Tabela: `relatorios`
```sql
CREATE TABLE relatorios (
    id_relatorio SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'arvores', 'inspecoes', 'manejo', 'personalizado'
    filtros JSONB, -- Filtros aplicados
    formato VARCHAR(10) NOT NULL, -- 'pdf', 'csv', 'xlsx'
    caminho_arquivo VARCHAR(255),
    status VARCHAR(20) DEFAULT 'processando', -- 'processando', 'concluido', 'erro'
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    tamanho_arquivo BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_relatorios_usuario ON relatorios (id_usuario);
CREATE INDEX idx_relatorios_tipo ON relatorios (tipo);
CREATE INDEX idx_relatorios_status ON relatorios (status);
```

### 12. Tabela: `sync_log`
```sql
CREATE TABLE sync_log (
    id_sync SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    dispositivo_id VARCHAR(100),
    tipo_operacao VARCHAR(20) NOT NULL, -- 'upload', 'download'
    tabela_afetada VARCHAR(50),
    registros_processados INTEGER DEFAULT 0,
    registros_erro INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'iniciado', -- 'iniciado', 'concluido', 'erro'
    detalhes_erro TEXT,
    timestamp_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp_fim TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_log_usuario ON sync_log (id_usuario);
CREATE INDEX idx_sync_log_dispositivo ON sync_log (dispositivo_id);
CREATE INDEX idx_sync_log_timestamp ON sync_log (timestamp_inicio);
```

## 🔧 Funções e Triggers Temporais

### Função para Atualizar Registros Temporais
```sql
CREATE OR REPLACE FUNCTION update_temporal_record()
RETURNS TRIGGER AS $$
BEGIN
    -- Finaliza o registro anterior
    UPDATE dados_dendrometricos 
    SET valid_to = NEW.valid_from, tx_end = NOW()
    WHERE id_inspecao = NEW.id_inspecao 
    AND valid_to = 'infinity' 
    AND id_dado != NEW.id_dado;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Triggers para Tabelas Temporais
```sql
-- Trigger para dados_dendrometricos
CREATE TRIGGER trg_dados_dendrometricos_temporal
    BEFORE INSERT ON dados_dendrometricos
    FOR EACH ROW
    EXECUTE FUNCTION update_temporal_record();

-- Trigger para dados_fitossanitarios
CREATE TRIGGER trg_dados_fitossanitarios_temporal
    BEFORE INSERT ON dados_fitossanitarios
    FOR EACH ROW
    EXECUTE FUNCTION update_temporal_record();

-- Trigger para dados_entorno
CREATE TRIGGER trg_dados_entorno_temporal
    BEFORE INSERT ON dados_entorno
    FOR EACH ROW
    EXECUTE FUNCTION update_temporal_record();

-- Trigger para avaliacoes_risco
CREATE TRIGGER trg_avaliacoes_risco_temporal
    BEFORE INSERT ON avaliacoes_risco
    FOR EACH ROW
    EXECUTE FUNCTION update_temporal_record();
```

## 📈 Views para Consultas Otimizadas

### View: Estado Atual das Árvores
```sql
CREATE VIEW v_arvores_estado_atual AS
SELECT 
    a.id_arvore,
    a.numero_etiqueta,
    a.localizacao,
    a.endereco,
    e.nome_comum,
    e.nome_cientifico,
    dd.dap_cm,
    dd.altura_total_m,
    df.estado_saude,
    ar.categoria_risco,
    i.data_inspecao AS ultima_inspecao
FROM arvores a
LEFT JOIN especies e ON a.id_especie = e.id_especie
LEFT JOIN inspecoes i ON a.id_arvore = i.id_arvore
LEFT JOIN dados_dendrometricos dd ON i.id_inspecao = dd.id_inspecao 
    AND dd.valid_to = 'infinity'
LEFT JOIN dados_fitossanitarios df ON i.id_inspecao = df.id_inspecao 
    AND df.valid_to = 'infinity'
LEFT JOIN avaliacoes_risco ar ON i.id_inspecao = ar.id_inspecao 
    AND ar.valid_to = 'infinity'
WHERE i.data_inspecao = (
    SELECT MAX(data_inspecao) 
    FROM inspecoes i2 
    WHERE i2.id_arvore = a.id_arvore
);
```

### View: Histórico Completo por Árvore
```sql
CREATE VIEW v_historico_arvore AS
SELECT 
    a.id_arvore,
    i.data_inspecao,
    dd.dap_cm,
    dd.altura_total_m,
    df.estado_saude,
    ar.categoria_risco,
    dd.valid_from,
    dd.valid_to
FROM arvores a
JOIN inspecoes i ON a.id_arvore = i.id_arvore
LEFT JOIN dados_dendrometricos dd ON i.id_inspecao = dd.id_inspecao
LEFT JOIN dados_fitossanitarios df ON i.id_inspecao = df.id_inspecao
LEFT JOIN avaliacoes_risco ar ON i.id_inspecao = ar.id_inspecao
ORDER BY a.id_arvore, i.data_inspecao;
```

### View: Estatísticas por Espécie
```sql
CREATE VIEW v_estatisticas_especies AS
SELECT 
    e.nome_comum,
    e.nome_cientifico,
    COUNT(a.id_arvore) as total_arvores,
    AVG(dd.dap_cm) as dap_medio,
    AVG(dd.altura_total_m) as altura_media,
    COUNT(CASE WHEN df.estado_saude = 'critico' THEN 1 END) as arvores_criticas,
    COUNT(CASE WHEN ar.categoria_risco = 'alto' THEN 1 END) as arvores_alto_risco
FROM especies e
LEFT JOIN arvores a ON e.id_especie = a.id_especie
LEFT JOIN v_arvores_estado_atual v ON a.id_arvore = v.id_arvore
LEFT JOIN dados_dendrometricos dd ON dd.valid_to = 'infinity'
LEFT JOIN dados_fitossanitarios df ON df.valid_to = 'infinity'
LEFT JOIN avaliacoes_risco ar ON ar.valid_to = 'infinity'
GROUP BY e.id_especie, e.nome_comum, e.nome_cientifico;
```

## 🔍 Índices de Performance

### Índices Espaciais (PostGIS)
```sql
-- Índice principal para localização
CREATE INDEX idx_arvores_localizacao_gist ON arvores USING GIST (localizacao);

-- Índice para fotos com localização
CREATE INDEX idx_fotos_localizacao_gist ON fotos USING GIST (localizacao_gps);
```

### Índices Temporais
```sql
-- Índices para consultas temporais eficientes
CREATE INDEX idx_dados_dendrometricos_temporal 
ON dados_dendrometricos (valid_from, valid_to, tx_start, tx_end);

CREATE INDEX idx_dados_fitossanitarios_temporal 
ON dados_fitossanitarios (valid_from, valid_to, tx_start, tx_end);

CREATE INDEX idx_dados_entorno_temporal 
ON dados_entorno (valid_from, valid_to, tx_start, tx_end);

CREATE INDEX idx_avaliacoes_risco_temporal 
ON avaliacoes_risco (valid_from, valid_to, tx_start, tx_end);
```

### Índices de Busca
```sql
-- Busca por texto em espécies
CREATE INDEX idx_especies_nome_comum_gin 
ON especies USING GIN (to_tsvector('portuguese', nome_comum));

CREATE INDEX idx_especies_nome_cientifico_gin 
ON especies USING GIN (to_tsvector('portuguese', nome_cientifico));

-- Busca em observações
CREATE INDEX idx_inspecoes_observacoes_gin 
ON inspecoes USING GIN (to_tsvector('portuguese', observacoes_gerais));
```

## 📊 Consultas de Exemplo

### 1. Estado Atual de uma Árvore
```sql
SELECT * FROM v_arvores_estado_atual WHERE id_arvore = 123;
```

### 2. Histórico de Saúde de uma Árvore
```sql
SELECT 
    data_inspecao,
    estado_saude,
    valid_from,
    valid_to
FROM v_historico_arvore 
WHERE id_arvore = 123 
ORDER BY data_inspecao;
```

### 3. Árvores que Precisam de Ação Urgente
```sql
SELECT 
    a.id_arvore,
    a.endereco,
    e.nome_comum,
    am.acao_proposta,
    am.nivel_urgencia
FROM arvores a
JOIN inspecoes i ON a.id_arvore = i.id_arvore
JOIN acoes_manejo am ON i.id_inspecao = am.id_inspecao
JOIN especies e ON a.id_especie = e.id_especie
WHERE am.nivel_urgencia IN ('alta', 'emergencial')
AND am.executado = false
ORDER BY 
    CASE am.nivel_urgencia 
        WHEN 'emergencial' THEN 1 
        WHEN 'alta' THEN 2 
    END,
    i.data_inspecao DESC;
```

### 4. Árvores em Área Específica (Consulta Espacial)
```sql
SELECT 
    a.id_arvore,
    a.endereco,
    e.nome_comum,
    ST_AsText(a.localizacao) as coordenadas
FROM arvores a
JOIN especies e ON a.id_especie = e.id_especie
WHERE ST_DWithin(
    a.localizacao,
    ST_GeomFromText('POINT(-46.6333 -23.5505)', 4326), -- São Paulo centro
    1000 -- 1km de raio
);
```

### 5. Relatório de Diversidade de Espécies
```sql
SELECT 
    e.nome_comum,
    e.nome_cientifico,
    e.nativa,
    COUNT(a.id_arvore) as quantidade,
    ROUND(COUNT(a.id_arvore) * 100.0 / SUM(COUNT(a.id_arvore)) OVER (), 2) as percentual
FROM especies e
LEFT JOIN arvores a ON e.id_especie = a.id_especie
GROUP BY e.id_especie, e.nome_comum, e.nome_cientifico, e.nativa
ORDER BY quantidade DESC;
```

## 🔐 Segurança e Permissões

### Roles de Usuário
```sql
-- Role para inspetores (leitura e escrita de dados de campo)
CREATE ROLE inspetor;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO inspetor;

-- Role para visualizadores (apenas leitura)
CREATE ROLE visualizador;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO visualizador;

-- Role para administradores (acesso completo)
CREATE ROLE administrador;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO administrador;
```

### Row Level Security (RLS)
```sql
-- Habilitar RLS para controle de acesso por usuário
ALTER TABLE inspecoes ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem suas próprias inspeções
CREATE POLICY inspecoes_usuario_policy ON inspecoes
    FOR ALL TO inspetor
    USING (id_usuario = current_setting('app.current_user_id')::INTEGER);
```

Este design de banco de dados garante:
- ✅ Preservação completa do histórico temporal
- ✅ Performance otimizada com índices apropriados
- ✅ Suporte completo a dados geoespaciais
- ✅ Flexibilidade para consultas complexas
- ✅ Segurança com controle de acesso
- ✅ Escalabilidade para grandes volumes de dados