# TreeInspector

Uma plataforma completa de inspeção de árvores com arquitetura Mobile First, desenvolvida para profissionais de arborização urbana.

## 🌳 Sobre o Projeto

O TreeInspector é uma solução integrada que combina uma aplicação móvel para coleta de dados em campo com um dashboard web para análise e gestão. O sistema foi projetado com foco na funcionalidade offline e no rastreamento histórico temporal de dados.

### Principais Funcionalidades

- **📱 App Móvel React Native**: Coleta de dados offline com sincronização automática
- **🖥️ Dashboard Web React**: Visualização de dados com mapas GIS interativos
- **🗄️ Banco Temporal**: Histórico completo de todas as inspeções
- **🤖 IA Integrada**: Identificação de espécies via Pl@ntNet API
- **📊 Relatórios**: Geração automática de PDFs e CSVs
- **🔄 Sincronização**: Sistema robusto de sync bidirecional
- **📋 ABNT NBR 16246-3**: Avaliação de risco conforme norma técnica

## 🏗️ Arquitetura

```
TreeInspector/
├── mobile/          # App React Native
├── backend/         # API Node.js/Express
├── web/            # Dashboard React
├── database/       # Scripts PostgreSQL
└── docs/           # Documentação
```

### Stack Tecnológica

- **Mobile**: React Native + SQLite + Redux Toolkit
- **Backend**: Node.js + Express + PostgreSQL + PostGIS
- **Web**: React + Material-UI + Mapbox + Recharts
- **Database**: PostgreSQL 15+ com PostGIS
- **Cache**: Redis
- **Deploy**: Docker + Docker Compose

## 🚀 Quick Start

### Pré-requisitos

- **Node.js 22.17.0+** (Download: https://nodejs.org/)
- PostgreSQL 15+ com PostGIS
- Redis
- Docker e Docker Compose (opcional)

### Instalação Automática

#### Windows
```cmd
# Clone o repositório
git clone https://github.com/seu-usuario/treeinspector-app.git
cd treeinspector-app

# Execute o script de setup
scripts\setup.bat
```

#### Linux/macOS
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/treeinspector-app.git
cd treeinspector-app

# Torne o script executável e execute
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Instalação Manual

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/treeinspector-app.git
cd treeinspector-app
```

2. **Configure o ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Inicie os serviços com Docker**
```bash
docker-compose up -d
```

4. **Ou configure manualmente:**

```bash
# Backend
cd backend
npm install
npm run migrate
npm run seed
npm run dev

# Web Dashboard
cd ../web
npm install
npm start

# Mobile (em outro terminal)
cd ../mobile
npm install
npx react-native run-android  # ou run-ios
```

### Configuração do Banco de Dados

#### Com Docker (Recomendado)
```bash
# Iniciar PostgreSQL e Redis
docker-compose up -d postgres redis

# Aguardar inicialização e executar schema
docker-compose exec -T postgres psql -U treeinspector -d treeinspector < database/schema.sql
```

#### Manual
```bash
# Criar banco e extensões
createdb treeinspector
psql treeinspector -c "CREATE EXTENSION postgis;"

# Executar schema
psql treeinspector < database/schema.sql
```

## 📱 Aplicação Móvel

### Funcionalidades Principais

- ✅ Coleta de dados offline
- ✅ Captura de fotos com GPS
- ✅ Identificação de espécies por IA
- ✅ Avaliação de risco ABNT
- ✅ Sincronização automática
- ✅ Interface Material Design

### Fluxo de Inspeção

1. **Identificação da Árvore**: GPS automático, foto para IA
2. **Dados Dendrométricos**: DAP, altura, método de medição
3. **Estado Fitossanitário**: Classificação e problemas observados
4. **Condições do Entorno**: Calçadas, redes, uso do solo
5. **Avaliação de Risco**: Conforme ABNT NBR 16246-3
6. **Ações de Manejo**: Recomendações e urgência
7. **Fotos**: Documentação visual completa

## 🖥️ Dashboard Web

### Recursos Disponíveis

- 📊 **Dashboard Analítico**: KPIs e gráficos em tempo real
- 🗺️ **Mapa Interativo**: Visualização geoespacial com filtros
- 📋 **Gestão de Árvores**: CRUD completo com histórico
- 📈 **Análise Temporal**: Evolução da saúde das árvores
- 📄 **Relatórios**: Geração personalizada de documentos
- 👥 **Multiusuário**: Controle de acesso por papéis

### Tipos de Usuário

- **👨‍💼 Administrador**: Acesso completo ao sistema
- **🌳 Inspetor**: Coleta e visualização de dados
- **👁️ Visualizador**: Apenas consulta de informações

## 🗄️ Banco de Dados

### Modelo Temporal

O sistema implementa um modelo **bitemporal** que preserva:

- **Tempo Válido**: Quando o fato era verdadeiro no mundo real
- **Tempo de Transação**: Quando foi registrado no sistema

### Principais Tabelas

- `arvores` - Dados básicos das árvores
- `especies` - Catálogo de espécies
- `inspecoes` - Registros de inspeções
- `dados_dendrometricos` - Medições temporais
- `dados_fitossanitarios` - Estados de saúde temporais
- `avaliacoes_risco` - Avaliações de risco temporais

## 🔌 API REST

### Endpoints Principais

```
POST   /api/auth/login              # Autenticação
GET    /api/trees                   # Listar árvores
POST   /api/inspections             # Nova inspeção
POST   /api/species/identify        # Identificar espécie
POST   /api/sync/upload             # Sincronizar dados
GET    /api/reports/generate        # Gerar relatório
```

### Autenticação

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "senha": "password"}'

# Usar token
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/trees
```

## 🧪 Testes

```bash
# Testes unitários
npm test

# Testes de integração
npm run test:integration

# Testes E2E
npm run test:e2e

# Cobertura
npm run test:coverage
```

## 📦 Deploy

### Docker Compose (Recomendado)

```bash
# Produção
docker-compose -f docker-compose.prod.yml up -d

# Desenvolvimento
docker-compose up -d
```

### Deploy Manual

```bash
# Build
npm run build:all

# Migrate
npm run migrate:prod

# Start
npm run start:prod
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/treeinspector
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# APIs Externas
PLANTNET_API_KEY=your-plantnet-key
GBIF_API_URL=https://api.gbif.org/v1

# Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10MB

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

## 🖥️ Comandos de Desenvolvimento

### Windows
```cmd
REM Instalar todas as dependências
npm run install:all

REM Desenvolvimento
npm run dev                 REM Backend + Web
npm run dev:mobile          REM React Native Metro

REM Docker
docker-compose up -d        REM Todos os serviços
docker-compose down         REM Parar serviços

REM Testes
npm run test               REM Todos os testes
npm run lint               REM Verificar código

REM Banco de dados
npm run db:migrate         REM Executar migrações
npm run db:seed           REM Popular dados
npm run db:reset          REM Resetar banco
```

### Linux/macOS
```bash
# Instalar todas as dependências
npm run install:all

# Desenvolvimento
npm run dev                 # Backend + Web
npm run dev:mobile          # React Native Metro

# Docker
docker-compose up -d        # Todos os serviços
docker-compose down         # Parar serviços

# Testes
npm run test               # Todos os testes
npm run lint               # Verificar código

# Banco de dados
npm run db:migrate         # Executar migrações
npm run db:seed           # Popular dados
npm run db:reset          # Resetar banco
```

## 📚 Documentação

- [Arquitetura](./ARCHITECTURE.md) - Visão geral da arquitetura
- [Estrutura do Projeto](./PROJECT_STRUCTURE.md) - Organização dos arquivos
- [Design do Banco](./DATABASE_DESIGN.md) - Modelo de dados temporal
- [API](./API_SPECIFICATION.md) - Documentação da API REST
- [Mobile](./MOBILE_APP_DESIGN.md) - Design da aplicação móvel
- [Web](./WEB_DASHBOARD_DESIGN.md) - Design do dashboard web

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- ESLint + Prettier para formatação
- Conventional Commits para mensagens
- Testes obrigatórios para novas features
- Documentação atualizada

## 🛠️ Solução de Problemas

### Windows

**Erro de permissão ao executar scripts:**
```cmd
# Execute como administrador ou configure o PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Erro com Docker no Windows:**
```cmd
# Certifique-se que o Docker Desktop está rodando
# Habilite WSL2 se necessário
```

**Erro com Node.js/npm:**
```cmd
# Limpar cache do npm
npm cache clean --force

# Reinstalar node_modules
rmdir /s node_modules
npm install
```

**Versão do Node.js incorreta:**
```cmd
# Verifique a versão instalada
node --version

# Deve ser 22.17.0 ou superior
# Download: https://nodejs.org/
```

### Linux/macOS

**Erro de permissão:**
```bash
# Dar permissão ao script
chmod +x scripts/setup.sh

# Ou executar com bash
bash scripts/setup.sh
```

**Erro com PostgreSQL:**
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Instalar PostGIS
sudo apt-get install postgresql-postgis
```

**Versão do Node.js incorreta:**
```bash
# Verificar versão
node --version

# Instalar Node.js 22.17.0+ via nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22.17.0
nvm use 22.17.0
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📧 Email: suporte@treeinspector.com
- 📱 WhatsApp: +55 11 99999-9999
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/treeinspector-app/issues)
- 📖 Wiki: [GitHub Wiki](https://github.com/seu-usuario/treeinspector-app/wiki)

## 🏆 Créditos

Desenvolvido com base nas especificações do documento "Projeto de Software: TreeInspector" e seguindo as melhores práticas de desenvolvimento de software.

### Tecnologias Utilizadas

- [React Native](https://reactnative.dev/) - Framework mobile
- [React](https://reactjs.org/) - Biblioteca web
- [Node.js](https://nodejs.org/) - Runtime JavaScript
- [PostgreSQL](https://www.postgresql.org/) - Banco de dados
- [PostGIS](https://postgis.net/) - Extensão geoespacial
- [Material-UI](https://mui.com/) - Componentes React
- [Mapbox](https://www.mapbox.com/) - Mapas interativos
- [Pl@ntNet](https://plantnet.org/) - API de identificação de plantas

---

**TreeInspector** - Transformando a gestão de árvores urbanas através da tecnologia 🌳📱