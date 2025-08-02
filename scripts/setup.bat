@echo off
setlocal enabledelayedexpansion

REM Script de setup inicial do TreeInspector para Windows
REM Este script configura o ambiente de desenvolvimento completo

echo.
echo 🌳 TreeInspector - Setup Inicial (Windows)
echo ==========================================

REM Verificar se está no diretório correto
if not exist "package.json" (
    echo ❌ Execute este script a partir do diretório raiz do projeto
    pause
    exit /b 1
)

REM Verificar Node.js
echo ℹ️  Verificando dependências do sistema...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado. Instale Node.js 18+ antes de continuar.
    echo    Download: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION:~1%") do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 18 (
    echo ❌ Node.js versão 18+ é necessária. Versão atual: %NODE_VERSION%
    pause
    exit /b 1
)

echo ✅ Node.js %NODE_VERSION% encontrado

REM Verificar npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm não encontrado
    pause
    exit /b 1
)

for /f %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% encontrado

REM Verificar Docker (opcional)
docker --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Docker não encontrado. Você precisará configurar PostgreSQL e Redis manualmente.
    set DOCKER_AVAILABLE=false
) else (
    for /f "tokens=3" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo ✅ Docker %DOCKER_VERSION% encontrado
    set DOCKER_AVAILABLE=true
)

REM Verificar Docker Compose (opcional)
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Docker Compose não encontrado
    set COMPOSE_AVAILABLE=false
) else (
    for /f "tokens=3" %%i in ('docker-compose --version') do set COMPOSE_VERSION=%%i
    echo ✅ Docker Compose %COMPOSE_VERSION% encontrado
    set COMPOSE_AVAILABLE=true
)

echo.
echo ℹ️  Iniciando setup...

REM 1. Configurar arquivo .env
echo ℹ️  Configurando arquivo .env...
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo ✅ Arquivo .env criado a partir do .env.example
    echo ⚠️  Edite o arquivo .env com suas configurações antes de continuar
) else (
    echo ⚠️  Arquivo .env já existe
)

REM 2. Instalar dependências do projeto raiz
echo ℹ️  Instalando dependências do projeto raiz...
call npm install
if errorlevel 1 (
    echo ❌ Erro ao instalar dependências do projeto raiz
    pause
    exit /b 1
)
echo ✅ Dependências do projeto raiz instaladas

REM 3. Instalar dependências do backend
echo ℹ️  Instalando dependências do backend...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Erro ao instalar dependências do backend
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ Dependências do backend instaladas

REM 4. Configurar banco de dados
if "%DOCKER_AVAILABLE%"=="true" if "%COMPOSE_AVAILABLE%"=="true" (
    echo.
    set /p USE_DOCKER="Deseja usar Docker para PostgreSQL e Redis? (y/n): "
    
    if /i "!USE_DOCKER!"=="y" (
        echo ℹ️  Iniciando serviços com Docker Compose...
        
        REM Parar containers existentes
        docker-compose down >nul 2>&1
        
        REM Iniciar apenas PostgreSQL e Redis
        docker-compose up -d postgres redis
        if errorlevel 1 (
            echo ❌ Erro ao iniciar containers
            pause
            exit /b 1
        )
        
        echo ℹ️  Aguardando PostgreSQL inicializar...
        timeout /t 15 /nobreak >nul
        
        REM Executar schema inicial
        echo ℹ️  Executando schema do banco de dados...
        docker-compose exec -T postgres psql -U treeinspector -d treeinspector < database/schema.sql
        if errorlevel 1 (
            echo ❌ Erro ao executar schema do banco
            pause
            exit /b 1
        )
        echo ✅ Schema do banco executado
        
    ) else (
        echo ⚠️  Configure PostgreSQL e Redis manualmente:
        echo   - PostgreSQL 15+ com PostGIS
        echo   - Redis 6+
        echo   - Execute o arquivo database/schema.sql no PostgreSQL
    )
) else (
    echo ⚠️  Configure PostgreSQL e Redis manualmente:
    echo   - PostgreSQL 15+ com PostGIS
    echo   - Redis 6+
    echo   - Execute o arquivo database/schema.sql no PostgreSQL
)

REM 5. Criar estrutura de diretórios
echo ℹ️  Criando estrutura de diretórios...

REM Backend
if not exist "backend\logs" mkdir "backend\logs"
if not exist "backend\uploads" mkdir "backend\uploads"
if not exist "backend\temp" mkdir "backend\temp"
if not exist "backend\backups" mkdir "backend\backups"
if not exist "backend\src\routes" mkdir "backend\src\routes"
if not exist "backend\src\models" mkdir "backend\src\models"
if not exist "backend\src\services" mkdir "backend\src\services"
if not exist "backend\src\controllers" mkdir "backend\src\controllers"
if not exist "backend\src\middleware" mkdir "backend\src\middleware"
if not exist "backend\src\utils" mkdir "backend\src\utils"
if not exist "backend\tests\unit" mkdir "backend\tests\unit"
if not exist "backend\tests\integration" mkdir "backend\tests\integration"
if not exist "backend\tests\fixtures" mkdir "backend\tests\fixtures"

REM Web
if not exist "web\src\components" mkdir "web\src\components"
if not exist "web\src\pages" mkdir "web\src\pages"
if not exist "web\src\services" mkdir "web\src\services"
if not exist "web\src\store" mkdir "web\src\store"
if not exist "web\src\utils" mkdir "web\src\utils"
if not exist "web\src\hooks" mkdir "web\src\hooks"
if not exist "web\src\styles" mkdir "web\src\styles"
if not exist "web\public" mkdir "web\public"
if not exist "web\build" mkdir "web\build"

REM Mobile
if not exist "mobile\src\components" mkdir "mobile\src\components"
if not exist "mobile\src\screens" mkdir "mobile\src\screens"
if not exist "mobile\src\services" mkdir "mobile\src\services"
if not exist "mobile\src\store" mkdir "mobile\src\store"
if not exist "mobile\src\utils" mkdir "mobile\src\utils"
if not exist "mobile\src\hooks" mkdir "mobile\src\hooks"
if not exist "mobile\src\navigation" mkdir "mobile\src\navigation"
if not exist "mobile\android" mkdir "mobile\android"
if not exist "mobile\ios" mkdir "mobile\ios"

REM Docs
if not exist "docs\api" mkdir "docs\api"
if not exist "docs\mobile" mkdir "docs\mobile"
if not exist "docs\web" mkdir "docs\web"
if not exist "docs\database" mkdir "docs\database"
if not exist "docs\deployment" mkdir "docs\deployment"

echo ✅ Estrutura de diretórios criada

REM 6. Configurar Git hooks (se Git estiver disponível)
git --version >nul 2>&1
if not errorlevel 1 (
    if exist ".git" (
        echo ℹ️  Configurando Git hooks...
        
        if not exist ".husky" (
            call npx husky install
            call npx husky add .husky/pre-commit "npm run lint"
            call npx husky add .husky/pre-push "npm run test"
            echo ✅ Git hooks configurados
        ) else (
            echo ⚠️  Git hooks já configurados
        )
    )
)

echo.
echo ✅ Setup concluído!
echo.
echo 📋 Próximos passos:
echo   1. Edite o arquivo .env com suas configurações
echo   2. Configure as chaves de API (PlantNet, Mapbox)
echo   3. Execute 'npm run dev' para iniciar o desenvolvimento
echo.
echo 🚀 Comandos úteis:
echo   npm run dev              - Iniciar backend e web em desenvolvimento
echo   npm run dev:mobile       - Iniciar Metro bundler (React Native)
echo   docker-compose up -d     - Iniciar todos os serviços
echo   npm run test             - Executar todos os testes
echo   npm run lint             - Verificar código
echo.
echo 📚 Documentação:
echo   http://localhost:3000/api/docs  - Swagger API docs
echo   http://localhost:3001           - Web dashboard
echo.
echo ✅ TreeInspector está pronto para desenvolvimento! 🌳

pause