# Especificação da API - TreeInspector

## 🌐 API REST Node.js/Express

### Base URL
```
Desenvolvimento: http://localhost:3000/api
Produção: https://api.treeinspector.com/api
```

### Autenticação
Todas as rotas protegidas requerem um token JWT no header:
```
Authorization: Bearer <jwt_token>
```

## 📋 Endpoints da API

### 🔐 Autenticação (`/api/auth`)

#### POST `/api/auth/register`
Registra um novo usuário no sistema.

**Request Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "senha": "senha123",
  "papel": "inspetor"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id_usuario": 1,
    "nome": "João Silva",
    "email": "joao@email.com",
    "papel": "inspetor",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST `/api/auth/login`
Autentica um usuário existente.

**Request Body:**
```json
{
  "email": "joao@email.com",
  "senha": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_usuario": 1,
    "nome": "João Silva",
    "email": "joao@email.com",
    "papel": "inspetor",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST `/api/auth/refresh`
Renova o token de acesso usando o refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/api/auth/logout`
Invalida o token atual do usuário.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

### 🌳 Árvores (`/api/trees`)

#### GET `/api/trees`
Lista todas as árvores com filtros opcionais.

**Query Parameters:**
- `page` (number): Página (default: 1)
- `limit` (number): Itens por página (default: 20)
- `especie` (string): Filtrar por espécie
- `estado_saude` (string): Filtrar por estado de saúde
- `categoria_risco` (string): Filtrar por categoria de risco
- `bbox` (string): Bounding box para filtro geográfico (formato: "minLng,minLat,maxLng,maxLat")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trees": [
      {
        "id_arvore": 1,
        "numero_etiqueta": "ARV001",
        "localizacao": {
          "type": "Point",
          "coordinates": [-46.6333, -23.5505]
        },
        "endereco": "Rua das Flores, 123",
        "especie": {
          "nome_comum": "Ipê Amarelo",
          "nome_cientifico": "Handroanthus chrysotrichus"
        },
        "ultima_inspecao": {
          "data_inspecao": "2024-01-15T10:30:00Z",
          "estado_saude": "bom",
          "categoria_risco": "baixo"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### POST `/api/trees`
Cria uma nova árvore no sistema.

**Request Body:**
```json
{
  "numero_etiqueta": "ARV002",
  "localizacao": {
    "type": "Point",
    "coordinates": [-46.6333, -23.5505]
  },
  "endereco": "Rua das Palmeiras, 456",
  "ponto_referencia": "Em frente ao mercado",
  "id_especie": 5,
  "contagem_agrupamento": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id_arvore": 2,
    "numero_etiqueta": "ARV002",
    "localizacao": {
      "type": "Point",
      "coordinates": [-46.6333, -23.5505]
    },
    "endereco": "Rua das Palmeiras, 456",
    "created_at": "2024-01-20T14:30:00Z"
  }
}
```

#### GET `/api/trees/:id`
Obtém detalhes completos de uma árvore específica.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_arvore": 1,
    "numero_etiqueta": "ARV001",
    "localizacao": {
      "type": "Point",
      "coordinates": [-46.6333, -23.5505]
    },
    "endereco": "Rua das Flores, 123",
    "especie": {
      "id_especie": 1,
      "nome_comum": "Ipê Amarelo",
      "nome_cientifico": "Handroanthus chrysotrichus",
      "familia": "Bignoniaceae",
      "nativa": true
    },
    "estado_atual": {
      "dap_cm": 45.5,
      "altura_total_m": 12.0,
      "estado_saude": "bom",
      "categoria_risco": "baixo"
    },
    "total_inspecoes": 5,
    "ultima_inspecao": "2024-01-15T10:30:00Z"
  }
}
```

#### GET `/api/trees/:id/history`
Obtém o histórico completo de inspeções de uma árvore.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_arvore": 1,
    "historico": [
      {
        "data_inspecao": "2024-01-15T10:30:00Z",
        "inspetor": "João Silva",
        "dados_dendrometricos": {
          "dap_cm": 45.5,
          "altura_total_m": 12.0,
          "altura_copa_m": 8.0
        },
        "dados_fitossanitarios": {
          "estado_saude": "bom",
          "problemas_observados": []
        },
        "avaliacao_risco": {
          "categoria_risco": "baixo",
          "pontuacao_risco": 15
        }
      }
    ]
  }
}
```

### 🔍 Inspeções (`/api/inspections`)

#### POST `/api/inspections`
Cria uma nova inspeção completa.

**Request Body:**
```json
{
  "id_arvore": 1,
  "data_inspecao": "2024-01-20T14:30:00Z",
  "observacoes_gerais": "Árvore em bom estado geral",
  "clima": "ensolarado",
  "temperatura": 25.5,
  "dados_dendrometricos": {
    "dap_cm": 46.0,
    "altura_total_m": 12.2,
    "altura_copa_m": 8.1,
    "metodo_medicao": "manual"
  },
  "dados_fitossanitarios": {
    "estado_saude": "bom",
    "problemas_observados": ["galhos_secos"],
    "severidade_problemas": "leve",
    "observacoes_detalhadas": "Alguns galhos secos na copa"
  },
  "dados_entorno": {
    "largura_calcada_m": 2.5,
    "tipo_calcada": "concreto",
    "redes_proximas": ["eletrica"],
    "uso_solo": "residencial"
  },
  "avaliacao_risco": {
    "nivel_avaliacao": 2,
    "categoria_risco": "baixo",
    "pontuacao_risco": 18,
    "defeitos_estruturais": [],
    "proximidade_alvos": "media"
  },
  "acoes_manejo": [
    {
      "acao_proposta": "poda_limpeza",
      "nivel_urgencia": "media",
      "justificativa": "Remoção de galhos secos"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id_inspecao": 15,
    "id_arvore": 1,
    "data_inspecao": "2024-01-20T14:30:00Z",
    "created_at": "2024-01-20T14:35:00Z"
  }
}
```

#### GET `/api/inspections/:id`
Obtém detalhes completos de uma inspeção.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_inspecao": 15,
    "arvore": {
      "id_arvore": 1,
      "numero_etiqueta": "ARV001",
      "endereco": "Rua das Flores, 123"
    },
    "inspetor": {
      "nome": "João Silva",
      "email": "joao@email.com"
    },
    "data_inspecao": "2024-01-20T14:30:00Z",
    "dados_completos": {
      "dendrometricos": { /* ... */ },
      "fitossanitarios": { /* ... */ },
      "entorno": { /* ... */ },
      "risco": { /* ... */ }
    },
    "fotos": [
      {
        "id_foto": 1,
        "tipo_foto": "geral",
        "caminho_arquivo": "/uploads/photos/tree_1_general_20240120.jpg"
      }
    ]
  }
}
```

### 🌿 Espécies (`/api/species`)

#### GET `/api/species`
Lista todas as espécies cadastradas.

**Query Parameters:**
- `search` (string): Busca por nome comum ou científico
- `nativa` (boolean): Filtrar por espécies nativas
- `page`, `limit`: Paginação

**Response (200):**
```json
{
  "success": true,
  "data": {
    "species": [
      {
        "id_especie": 1,
        "nome_comum": "Ipê Amarelo",
        "nome_cientifico": "Handroanthus chrysotrichus",
        "familia": "Bignoniaceae",
        "nativa": true,
        "porte_tipico": "grande",
        "total_arvores": 25
      }
    ],
    "pagination": { /* ... */ }
  }
}
```

#### POST `/api/species/identify`
Identifica uma espécie através de foto usando a API do Pl@ntNet.

**Request (multipart/form-data):**
- `image`: Arquivo de imagem
- `organs`: Array de órgãos da planta (ex: ["leaf", "flower"])

**Response (200):**
```json
{
  "success": true,
  "data": {
    "identificacoes": [
      {
        "nome_cientifico": "Handroanthus chrysotrichus",
        "nome_comum": "Ipê Amarelo",
        "confianca": 0.85,
        "familia": "Bignoniaceae"
      },
      {
        "nome_cientifico": "Handroanthus impetiginosus",
        "nome_comum": "Ipê Roxo",
        "confianca": 0.72,
        "familia": "Bignoniaceae"
      }
    ],
    "fonte": "PlantNet API"
  }
}
```

#### GET `/api/species/:id/info`
Obtém informações detalhadas de uma espécie do GBIF.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_especie": 1,
    "informacoes_basicas": {
      "nome_comum": "Ipê Amarelo",
      "nome_cientifico": "Handroanthus chrysotrichus",
      "familia": "Bignoniaceae"
    },
    "informacoes_gbif": {
      "gbif_id": 3172358,
      "status_taxonomico": "ACCEPTED",
      "distribuicao": {
        "paises": ["Brazil"],
        "biomas": ["Atlantic Forest", "Cerrado"]
      },
      "caracteristicas": {
        "porte": "Árvore de grande porte",
        "altura_maxima": "20-30m",
        "florescimento": "Julho a Setembro"
      }
    }
  }
}
```

### 🔄 Sincronização (`/api/sync`)

#### POST `/api/sync/upload`
Faz upload de dados coletados offline.

**Request Body:**
```json
{
  "dispositivo_id": "device_123",
  "dados": {
    "inspecoes": [
      {
        "id_local": "temp_1",
        "id_arvore": 1,
        "data_inspecao": "2024-01-20T14:30:00Z",
        "dados_completos": { /* ... */ }
      }
    ],
    "fotos": [
      {
        "id_local": "temp_photo_1",
        "id_inspecao_local": "temp_1",
        "base64_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
        "timestamp_foto": "2024-01-20T14:32:00Z"
      }
    ]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_sync": 123,
    "registros_processados": 1,
    "registros_erro": 0,
    "mapeamento_ids": {
      "temp_1": 15,
      "temp_photo_1": 45
    },
    "erros": []
  }
}
```

#### GET `/api/sync/download`
Baixa atualizações do servidor para sincronização.

**Query Parameters:**
- `last_sync` (ISO date): Data da última sincronização
- `dispositivo_id` (string): ID do dispositivo

**Response (200):**
```json
{
  "success": true,
  "data": {
    "timestamp_sync": "2024-01-20T15:00:00Z",
    "atualizacoes": {
      "especies_novas": [
        {
          "id_especie": 25,
          "nome_comum": "Pau-brasil",
          "nome_cientifico": "Paubrasilia echinata"
        }
      ],
      "arvores_atualizadas": [
        {
          "id_arvore": 5,
          "ultima_modificacao": "2024-01-20T14:45:00Z"
        }
      ]
    }
  }
}
```

### 📊 Relatórios (`/api/reports`)

#### POST `/api/reports/generate`
Gera um relatório personalizado.

**Request Body:**
```json
{
  "nome": "Relatório Mensal - Janeiro 2024",
  "tipo": "inspecoes",
  "formato": "pdf",
  "filtros": {
    "data_inicio": "2024-01-01",
    "data_fim": "2024-01-31",
    "estado_saude": ["ruim", "critico"],
    "categoria_risco": ["alto", "extremo"]
  },
  "campos": [
    "endereco",
    "especie",
    "estado_saude",
    "categoria_risco",
    "acoes_propostas"
  ]
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "id_relatorio": 45,
    "status": "processando",
    "estimativa_conclusao": "2024-01-20T15:05:00Z"
  }
}
```

#### GET `/api/reports/:id/status`
Verifica o status de geração de um relatório.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_relatorio": 45,
    "status": "concluido",
    "caminho_download": "/api/reports/45/download",
    "tamanho_arquivo": 2048576,
    "data_expiracao": "2024-01-27T15:00:00Z"
  }
}
```

#### GET `/api/reports/:id/download`
Faz download de um relatório gerado.

**Response:** Arquivo binário (PDF/CSV/XLSX)

### 👥 Usuários (`/api/users`)

#### GET `/api/users`
Lista usuários do sistema (apenas admins).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id_usuario": 1,
        "nome": "João Silva",
        "email": "joao@email.com",
        "papel": "inspetor",
        "ativo": true,
        "ultima_atividade": "2024-01-20T14:30:00Z"
      }
    ]
  }
}
```

#### PUT `/api/users/:id`
Atualiza dados de um usuário.

**Request Body:**
```json
{
  "nome": "João Silva Santos",
  "papel": "admin",
  "ativo": true
}
```

#### GET `/api/users/:id/activity`
Obtém log de atividades de um usuário.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "atividades": [
      {
        "data": "2024-01-20T14:30:00Z",
        "acao": "inspecao_criada",
        "detalhes": "Inspeção da árvore ARV001",
        "localizacao": "Rua das Flores, 123"
      }
    ]
  }
}
```

## 🔧 Middleware e Validações

### Middleware de Autenticação
```javascript
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de acesso requerido'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};
```

### Middleware de Permissões
```javascript
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.papel)) {
      return res.status(403).json({
        success: false,
        error: 'Permissão insuficiente'
      });
    }
    next();
  };
};
```

### Validação de Dados
```javascript
const validateInspection = (req, res, next) => {
  const schema = Joi.object({
    id_arvore: Joi.number().integer().required(),
    data_inspecao: Joi.date().iso().required(),
    dados_dendrometricos: Joi.object({
      dap_cm: Joi.number().positive().required(),
      altura_total_m: Joi.number().positive().required()
    }).required()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
};
```

## 📈 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Rate limiting geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em 15 minutos.'
  }
});

// Rate limiting para upload de fotos
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 uploads por minuto
  message: {
    success: false,
    error: 'Limite de upload excedido. Tente novamente em 1 minuto.'
  }
});
```

## 🚨 Tratamento de Erros

### Formato Padrão de Erro
```json
{
  "success": false,
  "error": "Mensagem de erro legível",
  "code": "ERROR_CODE",
  "details": {
    "field": "Campo específico com erro",
    "value": "Valor que causou o erro"
  },
  "timestamp": "2024-01-20T15:00:00Z"
}
```

### Códigos de Status HTTP
- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `401` - Não autenticado
- `403` - Sem permissão
- `404` - Recurso não encontrado
- `409` - Conflito (ex: email já existe)
- `422` - Dados não processáveis
- `429` - Rate limit excedido
- `500` - Erro interno do servidor

## 📝 Logs e Monitoramento

### Estrutura de Log
```json
{
  "timestamp": "2024-01-20T15:00:00Z",
  "level": "info",
  "message": "Inspeção criada com sucesso",
  "userId": 1,
  "treeId": 5,
  "inspectionId": 15,
  "ip": "192.168.1.100",
  "userAgent": "TreeInspector Mobile/1.0",
  "duration": 245
}
```

### Métricas de Performance
- Tempo de resposta por endpoint
- Taxa de erro por endpoint
- Número de requisições por minuto
- Uso de memória e CPU
- Conexões ativas do banco de dados

Esta especificação da API garante:
- ✅ Interface RESTful consistente
- ✅ Autenticação e autorização robustas
- ✅ Validação completa de dados
- ✅ Suporte a sincronização offline
- ✅ Geração de relatórios flexível
- ✅ Monitoramento e logs detalhados