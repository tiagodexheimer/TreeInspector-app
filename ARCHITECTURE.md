# Plano de Arquitetura - TreeInspector

## 🏗️ Arquitetura Geral do Sistema

```mermaid
graph TB
    subgraph "Frontend"
        A[App Mobile React Native]
        B[Dashboard Web React]
    end
    
    subgraph "Backend"
        C[API Node.js/Express]
        D[Sistema de Autenticação]
        E[Motor de Sincronização]
    end
    
    subgraph "Dados"
        F[PostgreSQL + PostGIS]
        G[Armazenamento Local SQLite]
    end
    
    subgraph "APIs Externas"
        H[Pl@ntNet API]
        I[GBIF API]
    end
    
    A --> C
    B --> C
    C --> F
    A --> G
    C --> H
    C --> I
    E --> F
```

## 📱 Estrutura do Projeto

```
TreeInspector-app/
├── mobile/                 # App React Native
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   └── package.json
├── backend/               # API Node.js/Express
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── package.json
├── web/                   # Dashboard React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── database/              # Scripts e migrações
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
└── docs/                  # Documentação
```

## 🗄️ Modelo de Dados Temporal

O sistema implementará um modelo **bitemporal** conforme especificado no documento:

### Tabelas Principais:
- `arvores` - Dados básicos das árvores
- `especies` - Catálogo de espécies
- `inspecoes` - Registros de inspeções
- `dados_dendrometricos` - Dados temporais de medições
- `dados_fitossanitarios` - Estados de saúde temporais
- `dados_entorno` - Condições do ambiente
- `acoes_manejo` - Recomendações de manejo
- `fotos` - Anexos multimídia

### Campos Temporais (para tabelas temporais):
- `valid_from` - Início da validade do registro
- `valid_to` - Fim da validade do registro
- `tx_start` - Início da transação
- `tx_end` - Fim da transação

## 📲 Aplicação Móvel - Funcionalidades Principais

### Arquitetura Offline-First:
- Base de dados local SQLite
- Sincronização automática em background
- Interface otimista (Optimistic UI)

### Módulos de Coleta:

#### 1. Identificação da Árvore
- Captura automática de GPS
- Integração com câmera
- Identificação por IA (Pl@ntNet)
- Geocodificação inversa para endereço

#### 2. Dados Dendrométricos
- Campos para DAP, altura total e altura da copa
- Suporte para medição manual e AR (beta)
- Registro do método de medição

#### 3. Estado Fitossanitário
- Sistema de classificação estruturado (Ótimo, Bom, Regular, Ruim, Crítico)
- Lista de verificação de problemas (pragas, doenças, danos mecânicos)
- Campo de observações detalhadas

#### 4. Condições do Entorno
- Largura de calçadas
- Redes de infraestrutura próximas
- Uso do solo
- Barreiras físicas

#### 5. Dados de Manejo
- Ação proposta (poda, supressão, etc.)
- Nível de urgência
- Sugestões de espécies para substituição
- Recomendações de plantio

#### 6. Avaliação de Risco ABNT NBR 16246-3
- Fluxo guiado por níveis (1, 2, 3)
- Cálculo automático de categoria de risco
- Conformidade com norma técnica brasileira

## 🌐 API Backend - Endpoints Principais

### Autenticação:
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout

### Árvores e Inspeções:
- `GET /api/trees` - Listar árvores com filtros
- `POST /api/trees` - Criar nova árvore
- `GET /api/trees/:id` - Detalhes de uma árvore
- `PUT /api/trees/:id` - Atualizar árvore
- `POST /api/inspections` - Nova inspeção
- `GET /api/inspections/:treeId/history` - Histórico de inspeções
- `GET /api/inspections/:id` - Detalhes de inspeção

### Espécies:
- `GET /api/species` - Listar espécies
- `POST /api/species/identify` - Identificação por foto (Pl@ntNet)
- `GET /api/species/:id/info` - Dados detalhados do GBIF

### Sincronização:
- `POST /api/sync/upload` - Upload de dados offline
- `GET /api/sync/download` - Download de atualizações
- `GET /api/sync/status` - Status da sincronização

### Relatórios:
- `GET /api/reports/trees` - Relatório de árvores
- `GET /api/reports/inspections` - Relatório de inspeções
- `POST /api/reports/custom` - Relatório personalizado
- `GET /api/reports/:id/download` - Download de relatório

### Usuários e Permissões:
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `GET /api/users/:id/permissions` - Permissões do usuário

## 🖥️ Dashboard Web - Funcionalidades

### Mapa GIS Interativo:
- Visualização de todas as árvores georreferenciadas
- Filtros por estado, espécie, risco, data
- Simbologia de cores dinâmica
- Clustering de pontos próximos
- Camadas de informação (redes, uso do solo)

### Painéis de Controle:
- Visão individual da árvore com histórico completo
- Timeline de inspeções
- Estatísticas agregadas e gráficos
- Mapa de calor de áreas de risco
- Dashboard analítico com KPIs

### Gerador de Relatórios:
- Exportação em PDF e CSV
- Relatórios personalizáveis
- Filtros avançados por múltiplos critérios
- Agendamento de relatórios
- Templates pré-definidos

### Gestão de Usuários:
- Controle de acesso baseado em papéis
- Gestão de equipes
- Atribuição de tarefas
- Auditoria de ações

## 🔧 Stack Tecnológica Detalhada

### Mobile (React Native):
- `@react-navigation/native` - Navegação entre telas
- `react-native-paper` - Material Design components
- `react-native-sqlite-storage` - Banco de dados local
- `@react-native-camera/camera` - Captura de fotos
- `react-native-geolocation-service` - Serviços de GPS
- `react-native-maps` - Mapas nativos
- `@reduxjs/toolkit` - Gerenciamento de estado
- `react-native-fs` - Sistema de arquivos
- `react-native-background-job` - Tarefas em background

### Backend (Node.js):
- `express` - Framework web
- `sequelize` - ORM para PostgreSQL
- `jsonwebtoken` - Autenticação JWT
- `bcryptjs` - Hash de senhas
- `multer` - Upload de arquivos
- `axios` - Requisições HTTP para APIs externas
- `joi` - Validação de dados
- `helmet` - Segurança HTTP
- `cors` - Cross-Origin Resource Sharing
- `winston` - Logging
- `node-cron` - Tarefas agendadas

### Web (React):
- `react-router-dom` - Roteamento SPA
- `@mui/material` - Interface Material-UI
- `mapbox-gl` - Mapas interativos
- `recharts` - Gráficos e visualizações
- `jspdf` - Geração de PDFs
- `@reduxjs/toolkit` - Gerenciamento de estado
- `react-query` - Cache e sincronização de dados
- `formik` - Formulários
- `yup` - Validação de esquemas

### Banco de Dados:
- `PostgreSQL 15+` - Banco principal
- `PostGIS` - Extensão geoespacial
- `Redis` - Cache e sessões
- `pg` - Driver PostgreSQL para Node.js

### DevOps e Ferramentas:
- `Docker` - Containerização
- `Docker Compose` - Orquestração local
- `Jest` - Testes unitários
- `Supertest` - Testes de API
- `ESLint` - Linting de código
- `Prettier` - Formatação de código
- `Husky` - Git hooks
- `GitHub Actions` - CI/CD

## 🚀 Plano de Implementação

### Fase 1: Fundação (Semanas 1-8)
1. **Configuração do Ambiente**
   - Setup do repositório Git
   - Configuração do Docker
   - Setup do banco PostgreSQL + PostGIS

2. **Backend Core**
   - API REST básica
   - Sistema de autenticação
   - Modelos de dados temporais
   - Migrações do banco

3. **Mobile Core**
   - Setup React Native
   - Navegação básica
   - Banco SQLite local
   - Formulários de coleta

### Fase 2: Funcionalidades Principais (Semanas 9-16)
1. **Coleta de Dados Móvel**
   - Todos os formulários de inspeção
   - Captura de fotos e GPS
   - Armazenamento offline

2. **Sincronização**
   - Motor de sync bidirecional
   - Resolução de conflitos
   - Background sync

3. **Integrações Externas**
   - API Pl@ntNet
   - API GBIF
   - Enriquecimento de dados

### Fase 3: Dashboard e Relatórios (Semanas 17-24)
1. **Dashboard Web**
   - Interface React
   - Mapa GIS interativo
   - Painéis de controle

2. **Sistema de Relatórios**
   - Gerador de PDFs
   - Exportação CSV
   - Filtros avançados

### Fase 4: Recursos Avançados (Semanas 25-32)
1. **Sistema Multiusuário**
   - Papéis e permissões
   - Gestão de equipes
   - Auditoria

2. **Análises Avançadas**
   - Tendências históricas
   - Dashboards analíticos
   - Alertas automáticos

### Fase 5: Finalização (Semanas 33-36)
1. **Testes e Qualidade**
   - Testes automatizados
   - Testes de performance
   - Testes de usabilidade

2. **Documentação e Deploy**
   - Documentação técnica
   - Manual do usuário
   - Deploy em produção

## 📊 Cronograma Detalhado

| Semana | Atividade Principal | Entregáveis |
|--------|-------------------|-------------|
| 1-2 | Setup inicial | Ambiente configurado, repo criado |
| 3-4 | Banco de dados | Schema implementado, migrações |
| 5-6 | API básica | Endpoints CRUD, autenticação |
| 7-8 | Mobile básico | App navegável, formulários |
| 9-10 | Coleta offline | Dados salvos localmente |
| 11-12 | Sincronização | Sync bidirecional funcionando |
| 13-14 | Integrações | APIs externas integradas |
| 15-16 | Avaliação de risco | Motor ABNT implementado |
| 17-18 | Dashboard base | Interface web básica |
| 19-20 | Mapa GIS | Visualização geoespacial |
| 21-22 | Relatórios | Geração de PDFs/CSV |
| 23-24 | Painéis analíticos | Dashboards com gráficos |
| 25-26 | Multiusuário | Sistema de permissões |
| 27-28 | Análises históricas | Tendências e insights |
| 29-30 | Testes | Cobertura de testes |
| 31-32 | Performance | Otimizações |
| 33-34 | Documentação | Manuais completos |
| 35-36 | Deploy | Sistema em produção |

## 🎯 Critérios de Sucesso

### Funcionalidades Obrigatórias:
- ✅ Coleta de dados offline no mobile
- ✅ Sincronização bidirecional
- ✅ Identificação de espécies por IA
- ✅ Avaliação de risco conforme ABNT
- ✅ Histórico temporal completo
- ✅ Dashboard GIS interativo
- ✅ Geração de relatórios
- ✅ Sistema multiusuário

### Métricas de Performance:
- Tempo de sincronização < 30s para 100 árvores
- App funciona 100% offline
- Dashboard carrega em < 3s
- Identificação de espécies em < 10s
- Suporte a 1000+ árvores por usuário

### Qualidade de Código:
- Cobertura de testes > 80%
- Documentação completa
- Código seguindo padrões ESLint
- Performance otimizada
- Segurança implementada

Este plano está alinhado com as especificações do documento TreeInspector e utiliza a stack JavaScript completa conforme solicitado. O sistema será robusto, escalável e seguirá as melhores práticas de desenvolvimento.