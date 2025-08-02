# Estrutura Detalhada do Projeto TreeInspector

## 📁 Estrutura de Diretórios Completa

```
TreeInspector-app/
├── README.md
├── ARCHITECTURE.md
├── PROJECT_STRUCTURE.md
├── docker-compose.yml
├── .gitignore
├── .env.example
│
├── mobile/                           # Aplicação React Native
│   ├── android/
│   ├── ios/
│   ├── src/
│   │   ├── components/               # Componentes reutilizáveis
│   │   │   ├── common/
│   │   │   │   ├── Button.js
│   │   │   │   ├── Input.js
│   │   │   │   ├── Loading.js
│   │   │   │   └── Modal.js
│   │   │   ├── forms/
│   │   │   │   ├── TreeIdentificationForm.js
│   │   │   │   ├── DendrometricForm.js
│   │   │   │   ├── PhytosanitaryForm.js
│   │   │   │   ├── EnvironmentForm.js
│   │   │   │   └── ManagementForm.js
│   │   │   ├── camera/
│   │   │   │   ├── CameraView.js
│   │   │   │   ├── PhotoGallery.js
│   │   │   │   └── PhotoPreview.js
│   │   │   └── maps/
│   │   │       ├── LocationPicker.js
│   │   │       └── TreeMarker.js
│   │   ├── screens/                  # Telas da aplicação
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.js
│   │   │   │   ├── RegisterScreen.js
│   │   │   │   └── ForgotPasswordScreen.js
│   │   │   ├── inspection/
│   │   │   │   ├── InspectionListScreen.js
│   │   │   │   ├── NewInspectionScreen.js
│   │   │   │   ├── InspectionFormScreen.js
│   │   │   │   ├── RiskAssessmentScreen.js
│   │   │   │   └── InspectionSummaryScreen.js
│   │   │   ├── trees/
│   │   │   │   ├── TreeListScreen.js
│   │   │   │   ├── TreeDetailScreen.js
│   │   │   │   ├── TreeHistoryScreen.js
│   │   │   │   └── TreeMapScreen.js
│   │   │   ├── sync/
│   │   │   │   ├── SyncScreen.js
│   │   │   │   └── SyncStatusScreen.js
│   │   │   └── settings/
│   │   │       ├── SettingsScreen.js
│   │   │       ├── ProfileScreen.js
│   │   │       └── AboutScreen.js
│   │   ├── services/                 # Serviços e APIs
│   │   │   ├── api/
│   │   │   │   ├── apiClient.js
│   │   │   │   ├── authApi.js
│   │   │   │   ├── treesApi.js
│   │   │   │   ├── inspectionsApi.js
│   │   │   │   ├── speciesApi.js
│   │   │   │   └── syncApi.js
│   │   │   ├── database/
│   │   │   │   ├── database.js
│   │   │   │   ├── models/
│   │   │   │   │   ├── Tree.js
│   │   │   │   │   ├── Inspection.js
│   │   │   │   │   ├── Species.js
│   │   │   │   │   └── Photo.js
│   │   │   │   └── migrations/
│   │   │   │       ├── 001_initial_schema.js
│   │   │   │       └── 002_add_sync_fields.js
│   │   │   ├── location/
│   │   │   │   ├── gpsService.js
│   │   │   │   └── geocodingService.js
│   │   │   ├── camera/
│   │   │   │   ├── cameraService.js
│   │   │   │   └── imageProcessor.js
│   │   │   ├── sync/
│   │   │   │   ├── syncManager.js
│   │   │   │   ├── conflictResolver.js
│   │   │   │   └── backgroundSync.js
│   │   │   └── storage/
│   │   │       ├── fileManager.js
│   │   │       └── secureStorage.js
│   │   ├── store/                    # Redux store
│   │   │   ├── index.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── treesSlice.js
│   │   │   │   ├── inspectionsSlice.js
│   │   │   │   ├── syncSlice.js
│   │   │   │   └── settingsSlice.js
│   │   │   └── middleware/
│   │   │       ├── syncMiddleware.js
│   │   │       └── persistMiddleware.js
│   │   ├── utils/                    # Utilitários
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   ├── validators.js
│   │   │   ├── formatters.js
│   │   │   └── permissions.js
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useLocation.js
│   │   │   ├── useCamera.js
│   │   │   ├── useSync.js
│   │   │   └── useOfflineStorage.js
│   │   └── navigation/
│   │       ├── AppNavigator.js
│   │       ├── AuthNavigator.js
│   │       └── TabNavigator.js
│   ├── __tests__/
│   ├── package.json
│   ├── metro.config.js
│   ├── babel.config.js
│   └── react-native.config.js
│
├── backend/                          # API Node.js/Express
│   ├── src/
│   │   ├── controllers/              # Controladores
│   │   │   ├── authController.js
│   │   │   ├── treesController.js
│   │   │   ├── inspectionsController.js
│   │   │   ├── speciesController.js
│   │   │   ├── usersController.js
│   │   │   ├── reportsController.js
│   │   │   └── syncController.js
│   │   ├── models/                   # Modelos Sequelize
│   │   │   ├── index.js
│   │   │   ├── User.js
│   │   │   ├── Tree.js
│   │   │   ├── Species.js
│   │   │   ├── Inspection.js
│   │   │   ├── DendrometricData.js
│   │   │   ├── PhytosanitaryData.js
│   │   │   ├── EnvironmentData.js
│   │   │   ├── ManagementAction.js
│   │   │   └── Photo.js
│   │   ├── routes/                   # Rotas da API
│   │   │   ├── index.js
│   │   │   ├── auth.js
│   │   │   ├── trees.js
│   │   │   ├── inspections.js
│   │   │   ├── species.js
│   │   │   ├── users.js
│   │   │   ├── reports.js
│   │   │   └── sync.js
│   │   ├── services/                 # Serviços de negócio
│   │   │   ├── authService.js
│   │   │   ├── treeService.js
│   │   │   ├── inspectionService.js
│   │   │   ├── speciesService.js
│   │   │   ├── plantnetService.js
│   │   │   ├── gbifService.js
│   │   │   ├── riskAssessmentService.js
│   │   │   ├── reportService.js
│   │   │   ├── syncService.js
│   │   │   └── emailService.js
│   │   ├── middleware/               # Middlewares
│   │   │   ├── auth.js
│   │   │   ├── validation.js
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js
│   │   │   ├── cors.js
│   │   │   └── logging.js
│   │   ├── utils/                    # Utilitários
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   ├── validators.js
│   │   │   ├── encryption.js
│   │   │   ├── fileUpload.js
│   │   │   └── temporal.js
│   │   ├── config/                   # Configurações
│   │   │   ├── database.js
│   │   │   ├── redis.js
│   │   │   ├── jwt.js
│   │   │   ├── upload.js
│   │   │   └── external-apis.js
│   │   └── app.js                    # Aplicação principal
│   ├── migrations/                   # Migrações do banco
│   │   ├── 20240101000001-create-users.js
│   │   ├── 20240101000002-create-species.js
│   │   ├── 20240101000003-create-trees.js
│   │   ├── 20240101000004-create-inspections.js
│   │   ├── 20240101000005-create-dendrometric-data.js
│   │   ├── 20240101000006-create-phytosanitary-data.js
│   │   ├── 20240101000007-create-environment-data.js
│   │   ├── 20240101000008-create-management-actions.js
│   │   └── 20240101000009-create-photos.js
│   ├── seeders/                      # Seeds do banco
│   │   ├── 20240101000001-demo-users.js
│   │   ├── 20240101000002-species-catalog.js
│   │   └── 20240101000003-sample-trees.js
│   ├── tests/                        # Testes
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── docs/                         # Documentação da API
│   │   ├── swagger.yaml
│   │   └── postman_collection.json
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── nodemon.json
│
├── web/                              # Dashboard React
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/               # Componentes reutilizáveis
│   │   │   ├── common/
│   │   │   │   ├── Layout.js
│   │   │   │   ├── Header.js
│   │   │   │   ├── Sidebar.js
│   │   │   │   ├── Loading.js
│   │   │   │   ├── ErrorBoundary.js
│   │   │   │   └── ConfirmDialog.js
│   │   │   ├── charts/
│   │   │   │   ├── SpeciesChart.js
│   │   │   │   ├── HealthChart.js
│   │   │   │   ├── RiskChart.js
│   │   │   │   └── TimelineChart.js
│   │   │   ├── maps/
│   │   │   │   ├── TreeMap.js
│   │   │   │   ├── HeatMap.js
│   │   │   │   ├── ClusterMap.js
│   │   │   │   └── LayerControl.js
│   │   │   ├── forms/
│   │   │   │   ├── TreeForm.js
│   │   │   │   ├── UserForm.js
│   │   │   │   ├── ReportForm.js
│   │   │   │   └── FilterForm.js
│   │   │   └── tables/
│   │   │       ├── TreeTable.js
│   │   │       ├── InspectionTable.js
│   │   │       ├── UserTable.js
│   │   │       └── ReportTable.js
│   │   ├── pages/                    # Páginas da aplicação
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.js
│   │   │   │   └── ForgotPasswordPage.js
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardPage.js
│   │   │   │   ├── OverviewPage.js
│   │   │   │   └── AnalyticsPage.js
│   │   │   ├── trees/
│   │   │   │   ├── TreeListPage.js
│   │   │   │   ├── TreeDetailPage.js
│   │   │   │   ├── TreeMapPage.js
│   │   │   │   └── TreeHistoryPage.js
│   │   │   ├── inspections/
│   │   │   │   ├── InspectionListPage.js
│   │   │   │   ├── InspectionDetailPage.js
│   │   │   │   └── InspectionReportPage.js
│   │   │   ├── reports/
│   │   │   │   ├── ReportsPage.js
│   │   │   │   ├── ReportBuilderPage.js
│   │   │   │   └── ReportViewerPage.js
│   │   │   ├── users/
│   │   │   │   ├── UserListPage.js
│   │   │   │   ├── UserDetailPage.js
│   │   │   │   └── UserPermissionsPage.js
│   │   │   └── settings/
│   │   │       ├── SettingsPage.js
│   │   │       ├── ProfilePage.js
│   │   │       └── SystemConfigPage.js
│   │   ├── services/                 # Serviços e APIs
│   │   │   ├── api/
│   │   │   │   ├── apiClient.js
│   │   │   │   ├── authApi.js
│   │   │   │   ├── treesApi.js
│   │   │   │   ├── inspectionsApi.js
│   │   │   │   ├── reportsApi.js
│   │   │   │   └── usersApi.js
│   │   │   ├── maps/
│   │   │   │   ├── mapboxService.js
│   │   │   │   └── geoService.js
│   │   │   └── reports/
│   │   │       ├── pdfGenerator.js
│   │   │       └── csvExporter.js
│   │   ├── store/                    # Redux store
│   │   │   ├── index.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── treesSlice.js
│   │   │   │   ├── inspectionsSlice.js
│   │   │   │   ├── reportsSlice.js
│   │   │   │   ├── usersSlice.js
│   │   │   │   └── uiSlice.js
│   │   │   └── middleware/
│   │   │       └── apiMiddleware.js
│   │   ├── utils/                    # Utilitários
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   └── permissions.js
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useApi.js
│   │   │   ├── useFilters.js
│   │   │   ├── usePagination.js
│   │   │   └── usePermissions.js
│   │   ├── styles/                   # Estilos
│   │   │   ├── theme.js
│   │   │   ├── globals.css
│   │   │   └── components.css
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── .env.example
│   └── build/
│
├── database/                         # Scripts de banco
│   ├── schema.sql                    # Schema completo
│   ├── functions.sql                 # Funções PostgreSQL
│   ├── triggers.sql                  # Triggers temporais
│   ├── indexes.sql                   # Índices otimizados
│   ├── views.sql                     # Views para consultas
│   ├── sample-data.sql               # Dados de exemplo
│   └── docker-compose.yml            # Banco local
│
├── docs/                             # Documentação
│   ├── api/
│   │   ├── README.md
│   │   ├── authentication.md
│   │   ├── endpoints.md
│   │   └── examples.md
│   ├── mobile/
│   │   ├── README.md
│   │   ├── setup.md
│   │   ├── offline-sync.md
│   │   └── troubleshooting.md
│   ├── web/
│   │   ├── README.md
│   │   ├── user-guide.md
│   │   └── admin-guide.md
│   ├── database/
│   │   ├── README.md
│   │   ├── schema.md
│   │   ├── temporal-model.md
│   │   └── queries.md
│   ├── deployment/
│   │   ├── README.md
│   │   ├── docker.md
│   │   ├── production.md
│   │   └── monitoring.md
│   └── user-manual/
│       ├── inspector-guide.md
│       ├── admin-guide.md
│       └── troubleshooting.md
│
├── scripts/                          # Scripts utilitários
│   ├── setup.sh                     # Setup inicial
│   ├── build.sh                     # Build completo
│   ├── deploy.sh                    # Deploy
│   ├── backup.sh                    # Backup do banco
│   ├── migrate.sh                   # Migrações
│   └── seed.sh                      # Popular dados
│
├── tests/                           # Testes E2E
│   ├── e2e/
│   ├── integration/
│   ├── performance/
│   └── fixtures/
│
└── infrastructure/                  # Infraestrutura
    ├── docker/
    │   ├── Dockerfile.backend
    │   ├── Dockerfile.web
    │   └── docker-compose.prod.yml
    ├── kubernetes/
    │   ├── backend-deployment.yaml
    │   ├── web-deployment.yaml
    │   ├── database-deployment.yaml
    │   └── ingress.yaml
    ├── terraform/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── monitoring/
        ├── prometheus.yml
        ├── grafana-dashboard.json
        └── alerts.yml
```

## 📋 Arquivos de Configuração Principais

### Root Level
- `README.md` - Documentação principal do projeto
- `ARCHITECTURE.md` - Arquitetura detalhada
- `PROJECT_STRUCTURE.md` - Este arquivo
- `docker-compose.yml` - Orquestração de containers
- `.gitignore` - Arquivos ignorados pelo Git
- `.env.example` - Exemplo de variáveis de ambiente

### Mobile (React Native)
- `package.json` - Dependências e scripts
- `metro.config.js` - Configuração do Metro bundler
- `babel.config.js` - Configuração do Babel
- `react-native.config.js` - Configuração do React Native

### Backend (Node.js)
- `package.json` - Dependências e scripts
- `server.js` - Ponto de entrada da aplicação
- `.env.example` - Variáveis de ambiente
- `nodemon.json` - Configuração do Nodemon

### Web (React)
- `package.json` - Dependências e scripts
- `public/index.html` - Template HTML
- `.env.example` - Variáveis de ambiente

## 🔧 Tecnologias por Módulo

### Mobile App
```json
{
  "framework": "React Native",
  "navigation": "@react-navigation/native",
  "ui": "react-native-paper",
  "state": "@reduxjs/toolkit",
  "database": "react-native-sqlite-storage",
  "maps": "react-native-maps",
  "camera": "@react-native-camera/camera",
  "location": "react-native-geolocation-service",
  "storage": "@react-native-async-storage/async-storage"
}
```

### Backend API
```json
{
  "framework": "Express.js",
  "database": "PostgreSQL + PostGIS",
  "orm": "Sequelize",
  "auth": "jsonwebtoken",
  "validation": "joi",
  "upload": "multer",
  "cache": "Redis",
  "logging": "winston",
  "testing": "Jest + Supertest"
}
```

### Web Dashboard
```json
{
  "framework": "React",
  "routing": "react-router-dom",
  "ui": "@mui/material",
  "state": "@reduxjs/toolkit",
  "maps": "mapbox-gl",
  "charts": "recharts",
  "forms": "formik + yup",
  "data": "react-query",
  "pdf": "jspdf"
}
```

### Database
```json
{
  "primary": "PostgreSQL 15+",
  "spatial": "PostGIS",
  "cache": "Redis",
  "migrations": "Sequelize CLI",
  "backup": "pg_dump"
}
```

## 📊 Fluxo de Dados

### 1. Coleta Offline (Mobile)
```
Inspetor → Formulários → SQLite Local → Sync Queue
```

### 2. Sincronização
```
SQLite Local → API Backend → PostgreSQL → Cache Redis
```

### 3. Visualização Web
```
PostgreSQL → API Backend → React Dashboard → Mapbox/Charts
```

### 4. Relatórios
```
PostgreSQL → Report Service → PDF/CSV → Download
```

## 🔐 Segurança

### Autenticação
- JWT tokens com refresh
- Bcrypt para senhas
- Rate limiting
- CORS configurado

### Autorização
- Role-based access control (RBAC)
- Middleware de permissões
- Auditoria de ações

### Dados
- Criptografia em trânsito (HTTPS)
- Validação de entrada
- SQL injection prevention
- File upload security

## 🚀 Scripts de Desenvolvimento

### Setup Inicial
```bash
./scripts/setup.sh          # Configuração completa
./scripts/build.sh          # Build de todos os módulos
```

### Desenvolvimento
```bash
npm run dev:mobile          # React Native Metro
npm run dev:backend         # Node.js com Nodemon
npm run dev:web            # React dev server
```

### Testes
```bash
npm run test:mobile         # Testes mobile
npm run test:backend        # Testes API
npm run test:web           # Testes web
npm run test:e2e           # Testes end-to-end
```

### Deploy
```bash
./scripts/deploy.sh         # Deploy completo
./scripts/backup.sh         # Backup do banco
```

Esta estrutura garante organização, escalabilidade e manutenibilidade do projeto TreeInspector, seguindo as melhores práticas de desenvolvimento de software.