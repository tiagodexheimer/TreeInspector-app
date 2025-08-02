#!/bin/bash

# Script de setup inicial do TreeInspector
# Este script configura o ambiente de desenvolvimento completo

set -e  # Parar em caso de erro

echo "🌳 TreeInspector - Setup Inicial"
echo "================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    log_error "Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Verificar dependências do sistema
log_info "Verificando dependências do sistema..."

# Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado. Instale Node.js 22.17.0+ antes de continuar."
    log_error "Download: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    log_error "Node.js versão 22.17.0+ é necessária. Versão atual: $(node -v)"
    log_error "Download: https://nodejs.org/"
    exit 1
fi

log_success "Node.js $(node -v) encontrado"

# npm
if ! command -v npm &> /dev/null; then
    log_error "npm não encontrado"
    exit 1
fi

log_success "npm $(npm -v) encontrado"

# Docker (opcional)
if command -v docker &> /dev/null; then
    log_success "Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1) encontrado"
    DOCKER_AVAILABLE=true
else
    log_warning "Docker não encontrado. Você precisará configurar PostgreSQL e Redis manualmente."
    DOCKER_AVAILABLE=false
fi

# Docker Compose (opcional)
if command -v docker-compose &> /dev/null; then
    log_success "Docker Compose $(docker-compose -v | cut -d' ' -f3 | cut -d',' -f1) encontrado"
    COMPOSE_AVAILABLE=true
else
    log_warning "Docker Compose não encontrado"
    COMPOSE_AVAILABLE=false
fi

echo ""
log_info "Iniciando setup..."

# 1. Configurar arquivo .env
log_info "Configurando arquivo .env..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    log_success "Arquivo .env criado a partir do .env.example"
    log_warning "Edite o arquivo .env com suas configurações antes de continuar"
else
    log_warning "Arquivo .env já existe"
fi

# 2. Instalar dependências do projeto raiz
log_info "Instalando dependências do projeto raiz..."
npm install
log_success "Dependências do projeto raiz instaladas"

# 3. Instalar dependências do backend
log_info "Instalando dependências do backend..."
cd backend
npm install
cd ..
log_success "Dependências do backend instaladas"

# 4. Configurar banco de dados
if [ "$DOCKER_AVAILABLE" = true ] && [ "$COMPOSE_AVAILABLE" = true ]; then
    echo ""
    read -p "Deseja usar Docker para PostgreSQL e Redis? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Iniciando serviços com Docker Compose..."
        
        # Parar containers existentes
        docker-compose down 2>/dev/null || true
        
        # Iniciar apenas PostgreSQL e Redis
        docker-compose up -d postgres redis
        
        log_info "Aguardando PostgreSQL inicializar..."
        sleep 10
        
        # Verificar se PostgreSQL está rodando
        if docker-compose exec postgres pg_isready -U treeinspector -d treeinspector; then
            log_success "PostgreSQL está rodando"
        else
            log_error "Erro ao inicializar PostgreSQL"
            exit 1
        fi
        
        # Executar schema inicial
        log_info "Executando schema do banco de dados..."
        docker-compose exec -T postgres psql -U treeinspector -d treeinspector < database/schema.sql
        log_success "Schema do banco executado"
        
    else
        log_warning "Configure PostgreSQL e Redis manualmente:"
        echo "  - PostgreSQL 15+ com PostGIS"
        echo "  - Redis 6+"
        echo "  - Execute o arquivo database/schema.sql no PostgreSQL"
    fi
else
    log_warning "Configure PostgreSQL e Redis manualmente:"
    echo "  - PostgreSQL 15+ com PostGIS"
    echo "  - Redis 6+"
    echo "  - Execute o arquivo database/schema.sql no PostgreSQL"
fi

# 5. Testar conexão com banco
log_info "Testando conexão com o banco de dados..."
cd backend
if npm run test:db 2>/dev/null; then
    log_success "Conexão com banco de dados OK"
else
    log_warning "Não foi possível testar a conexão com o banco"
fi
cd ..

# 6. Criar estrutura de diretórios
log_info "Criando estrutura de diretórios..."

# Backend
mkdir -p backend/logs backend/uploads backend/temp backend/backups
mkdir -p backend/src/routes backend/src/models backend/src/services
mkdir -p backend/src/controllers backend/src/middleware backend/src/utils
mkdir -p backend/tests/unit backend/tests/integration backend/tests/fixtures

# Web
mkdir -p web/src/components web/src/pages web/src/services
mkdir -p web/src/store web/src/utils web/src/hooks web/src/styles
mkdir -p web/public web/build

# Mobile
mkdir -p mobile/src/components mobile/src/screens mobile/src/services
mkdir -p mobile/src/store mobile/src/utils mobile/src/hooks mobile/src/navigation
mkdir -p mobile/android mobile/ios

# Docs
mkdir -p docs/api docs/mobile docs/web docs/database docs/deployment

log_success "Estrutura de diretórios criada"

# 7. Configurar Git hooks (se Git estiver disponível)
if command -v git &> /dev/null && [ -d ".git" ]; then
    log_info "Configurando Git hooks..."
    
    # Instalar husky se não estiver instalado
    if [ ! -d ".husky" ]; then
        npx husky install
        npx husky add .husky/pre-commit "npm run lint"
        npx husky add .husky/pre-push "npm run test"
        log_success "Git hooks configurados"
    else
        log_warning "Git hooks já configurados"
    fi
fi

# 8. Verificar se tudo está funcionando
echo ""
log_info "Verificando instalação..."

# Verificar se o backend pode iniciar
cd backend
if timeout 10s npm run dev &>/dev/null; then
    log_success "Backend pode ser iniciado"
else
    log_warning "Verifique a configuração do backend"
fi
cd ..

echo ""
log_success "Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "  1. Edite o arquivo .env com suas configurações"
echo "  2. Configure as chaves de API (PlantNet, Mapbox)"
echo "  3. Execute 'npm run dev' para iniciar o desenvolvimento"
echo ""
echo "🚀 Comandos úteis:"
echo "  npm run dev              - Iniciar backend e web em desenvolvimento"
echo "  npm run dev:mobile       - Iniciar Metro bundler (React Native)"
echo "  docker-compose up -d     - Iniciar todos os serviços"
echo "  npm run test             - Executar todos os testes"
echo "  npm run lint             - Verificar código"
echo ""
echo "📚 Documentação:"
echo "  http://localhost:3000/api/docs  - Swagger API docs"
echo "  http://localhost:3001           - Web dashboard"
echo ""
log_success "TreeInspector está pronto para desenvolvimento! 🌳"