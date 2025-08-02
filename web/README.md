# TreeInspector Web Dashboard

Dashboard web para o sistema TreeInspector - Plataforma completa de gestão e inspeção de árvores urbanas.

## 🌳 Sobre o Projeto

O TreeInspector Web é uma aplicação Next.js que fornece uma interface web completa para gestão de inspeções de árvores, visualização de dados GIS, geração de relatórios e administração do sistema.

## 🚀 Tecnologias

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Mapas**: Mapbox GL JS, React Map GL, Leaflet
- **Gráficos**: Recharts
- **Formulários**: React Hook Form + Yup
- **Estado**: Zustand + Immer
- **HTTP Client**: Axios + React Query
- **Autenticação**: JWT
- **Testes**: Jest + Testing Library

## 📋 Funcionalidades

### 🗺️ Dashboard GIS
- Visualização de árvores em mapa interativo
- Filtros avançados por localização, espécie, risco
- Camadas de dados geoespaciais
- Análise espacial e clustering

### 📊 Relatórios e Analytics
- Dashboard com métricas em tempo real
- Gráficos de tendências e estatísticas
- Exportação para PDF/CSV
- Relatórios personalizáveis

### 🌲 Gestão de Árvores
- Cadastro e edição de árvores
- Histórico completo de inspeções
- Galeria de fotos e documentos
- Avaliação de risco ABNT NBR 16246-3

### 👥 Administração
- Gestão de usuários e permissões
- Configurações do sistema
- Logs de auditoria
- Backup e sincronização

### 📱 Responsivo
- Design Mobile First
- Interface adaptativa
- PWA (Progressive Web App)
- Offline capabilities

## 🛠️ Instalação

### Pré-requisitos
- Node.js 22.17.0+
- npm 10.0.0+

### Configuração

1. **Instalar dependências**:
```bash
cd web
npm install
```

2. **Configurar variáveis de ambiente**:
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas configurações:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

3. **Executar em desenvolvimento**:
```bash
npm run dev
```

4. **Build para produção**:
```bash
npm run build
npm start
```

## 📁 Estrutura do Projeto

```
web/
├── src/
│   ├── app/                 # App Router (Next.js 13+)
│   │   ├── globals.css      # Estilos globais
│   │   ├── layout.tsx       # Layout principal
│   │   ├── page.tsx         # Página inicial
│   │   └── providers.tsx    # Providers React
│   ├── components/          # Componentes React
│   │   ├── ui/             # Componentes base
│   │   ├── forms/          # Formulários
│   │   ├── maps/           # Componentes de mapa
│   │   ├── charts/         # Gráficos
│   │   └── layout/         # Layout components
│   ├── contexts/           # Context providers
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilitários
│   ├── services/           # API services
│   ├── types/              # TypeScript types
│   └── utils/              # Funções utilitárias
├── public/                 # Assets estáticos
├── tailwind.config.js      # Configuração Tailwind
├── next.config.js          # Configuração Next.js
└── tsconfig.json          # Configuração TypeScript
```

## 🎨 Design System

### Cores
- **Primary**: Verde (#22c55e) - Representa natureza e sustentabilidade
- **Secondary**: Amarelo (#eab308) - Alertas e destaques
- **Danger**: Vermelho (#ef4444) - Riscos altos e erros
- **Success**: Verde claro (#22c55e) - Confirmações
- **Warning**: Laranja (#f59e0b) - Avisos
- **Info**: Azul (#3b82f6) - Informações

### Tipografia
- **Font Family**: Inter (sistema)
- **Font Mono**: JetBrains Mono

### Componentes
- Botões com variantes (primary, secondary, danger, etc.)
- Cards com shadow system
- Inputs com estados de erro
- Badges coloridos por categoria
- Loading spinners
- Modais responsivos

## 🗺️ Integração com Mapas

### Mapbox GL JS
```typescript
import { Map, Source, Layer } from 'react-map-gl';

// Configuração básica
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
```

### Leaflet (alternativa)
```typescript
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
```

## 📊 Gráficos e Visualizações

### Recharts
```typescript
import { LineChart, BarChart, PieChart } from 'recharts';

// Gráficos responsivos com dados em tempo real
```

## 🔐 Autenticação

### JWT Integration
```typescript
// Hook de autenticação
const { user, login, logout, isAuthenticated } = useAuth();

// Proteção de rotas
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated) return <LoginForm />;
  return children;
};
```

## 📱 PWA Features

### Service Worker
- Cache de recursos estáticos
- Offline fallbacks
- Background sync

### Manifest
```json
{
  "name": "TreeInspector",
  "short_name": "TreeInspector",
  "theme_color": "#22c55e",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/"
}
```

## 🧪 Testes

### Jest + Testing Library
```bash
# Executar testes
npm test

# Testes em modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

### Estrutura de Testes
```
__tests__/
├── components/
├── hooks/
├── utils/
└── pages/
```

## 🚀 Deploy

### Netlify
```bash
# Build automático via Git
npm run build
```

### Vercel
```bash
# Deploy com Vercel CLI
vercel --prod
```

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Desenvolvimento
- `npm run build` - Build produção
- `npm run start` - Servidor produção
- `npm run lint` - ESLint
- `npm run type-check` - TypeScript check
- `npm test` - Testes
- `npm run test:watch` - Testes em watch
- `npm run test:coverage` - Coverage

## 📚 Documentação

### Storybook (futuro)
```bash
npm run storybook
```

### API Documentation
- Swagger UI integrado
- Documentação interativa
- Exemplos de uso

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](../LICENSE) para detalhes.

## 🆘 Suporte

- **Email**: suporte@treeinspector.com
- **Documentação**: [docs.treeinspector.com](https://docs.treeinspector.com)
- **Issues**: [GitHub Issues](https://github.com/treeinspector/issues)

---

Desenvolvido com 💚 pela equipe TreeInspector