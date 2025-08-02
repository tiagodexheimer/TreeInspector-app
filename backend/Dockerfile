# Dockerfile para o backend TreeInspector
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S treeinspector -u 1001

# Criar diretórios necessários
RUN mkdir -p logs uploads temp && \
    chown -R treeinspector:nodejs /app

# Copiar código da aplicação
COPY --chown=treeinspector:nodejs . .

# Mudar para usuário não-root
USER treeinspector

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Comando padrão
CMD ["npm", "start"]