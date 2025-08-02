# TreeInspector Mobile

Aplicativo móvel React Native para inspeção de árvores urbanas com funcionalidades offline-first.

## 🌳 Sobre o Projeto

O TreeInspector Mobile é um aplicativo React Native desenvolvido com foco em Mobile First, permitindo que inspetores realizem coleta de dados de árvores urbanas mesmo sem conexão com a internet, sincronizando automaticamente quando a conectividade for restaurada.

## 🚀 Tecnologias

- **Framework**: React Native 0.73.2
- **Linguagem**: TypeScript
- **Navegação**: React Navigation 6
- **UI Library**: React Native Paper + React Native Elements
- **Banco Local**: SQLite (react-native-sqlite-storage)
- **Mapas**: React Native Maps
- **Câmera**: React Native Camera
- **Localização**: React Native Geolocation
- **Estado**: Zustand + Immer
- **HTTP Client**: Axios + React Query
- **Formulários**: React Hook Form + Yup
- **Autenticação**: JWT + Keychain

## 📋 Funcionalidades

### 🔍 Inspeção de Árvores
- Formulário completo de inspeção ABNT NBR 16246-3
- Captura de fotos com geolocalização
- Medições e observações detalhadas
- Avaliação de risco automatizada
- Modo offline completo

### 📍 Geolocalização
- GPS de alta precisão
- Mapeamento de árvores
- Navegação até pontos de inspeção
- Histórico de localizações
- Geocoding reverso

### 📷 Captura de Mídia
- Fotos de alta qualidade
- Redimensionamento automático
- Compressão inteligente
- Galeria organizada por inspeção
- Anotações em imagens

### 🔄 Sincronização
- Sync bidirecional automático
- Resolução de conflitos
- Queue de operações offline
- Indicadores de status
- Retry automático

### 🔐 Segurança
- Autenticação biométrica
- Armazenamento seguro (Keychain)
- Criptografia de dados locais
- Sessões JWT
- Controle de acesso

### 📊 Relatórios
- Relatórios locais
- Exportação PDF
- Compartilhamento
- Estatísticas offline
- Histórico de atividades

## 🛠️ Instalação

### Pré-requisitos

#### Desenvolvimento Android
- Node.js 22.17.0+
- Java Development Kit (JDK) 17
- Android Studio
- Android SDK (API 33+)
- Android Emulator ou dispositivo físico

#### Desenvolvimento iOS
- Node.js 22.17.0+
- Xcode 15+
- iOS Simulator ou dispositivo físico
- CocoaPods
- macOS (obrigatório)

### Configuração do Ambiente

1. **Instalar dependências**:
```bash
cd mobile
npm install
```

2. **Configurar iOS (apenas macOS)**:
```bash
cd ios && pod install && cd ..
```

3. **Configurar variáveis de ambiente**:
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
API_BASE_URL=http://localhost:3000/api/v1
MAPBOX_ACCESS_TOKEN=your-mapbox-token
SENTRY_DSN=your-sentry-dsn
```

### Executar o Projeto

#### Android
```bash
# Iniciar Metro bundler
npm start

# Em outro terminal, executar no Android
npm run android
```

#### iOS
```bash
# Iniciar Metro bundler
npm start

# Em outro terminal, executar no iOS
npm run ios
```

## 📁 Estrutura do Projeto

```
mobile/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── ui/             # Componentes base
│   │   ├── forms/          # Formulários
│   │   ├── maps/           # Componentes de mapa
│   │   └── camera/         # Componentes de câmera
│   ├── contexts/           # Context providers
│   │   ├── AuthContext.tsx
│   │   ├── DatabaseContext.tsx
│   │   ├── SyncContext.tsx
│   │   └── LocationContext.tsx
│   ├── database/           # SQLite schemas e migrations
│   │   ├── schemas/
│   │   ├── migrations/
│   │   └── models/
│   ├── hooks/              # Custom hooks
│   ├── navigation/         # Configuração de navegação
│   ├── screens/            # Telas do aplicativo
│   │   ├── auth/
│   │   ├── inspection/
│   │   ├── trees/
│   │   ├── maps/
│   │   └── settings/
│   ├── services/           # API e serviços
│   │   ├── api/
│   │   ├── database/
│   │   ├── sync/
│   │   └── location/
│   ├── types/              # TypeScript types
│   ├── utils/              # Funções utilitárias
│   ├── config/             # Configurações
│   └── assets/             # Imagens, ícones, etc.
├── android/                # Código nativo Android
├── ios/                    # Código nativo iOS
├── __tests__/              # Testes
└── e2e/                    # Testes E2E (Detox)
```

## 🗄️ Banco de Dados Local

### SQLite Schema
```sql
-- Árvores locais
CREATE TABLE trees (
  id TEXT PRIMARY KEY,
  species_id TEXT,
  latitude REAL,
  longitude REAL,
  diameter REAL,
  height REAL,
  created_at TEXT,
  updated_at TEXT,
  synced INTEGER DEFAULT 0
);

-- Inspeções
CREATE TABLE inspections (
  id TEXT PRIMARY KEY,
  tree_id TEXT,
  inspector_id TEXT,
  risk_level INTEGER,
  observations TEXT,
  photos TEXT, -- JSON array
  created_at TEXT,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (tree_id) REFERENCES trees (id)
);

-- Queue de sincronização
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT, -- 'CREATE', 'UPDATE', 'DELETE'
  table_name TEXT,
  record_id TEXT,
  data TEXT, -- JSON
  created_at TEXT,
  attempts INTEGER DEFAULT 0
);
```

## 📍 Geolocalização

### Configuração de Permissões

#### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

#### iOS (`ios/TreeInspectorMobile/Info.plist`)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Este app precisa de acesso à localização para registrar a posição das árvores</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Este app precisa de acesso à localização para registrar a posição das árvores</string>
```

### Uso da Geolocalização
```typescript
import Geolocation from '@react-native-community/geolocation';

const getCurrentLocation = (): Promise<Position> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
};
```

## 📷 Captura de Fotos

### Configuração da Câmera
```typescript
import { Camera } from '@react-native-camera/camera';

const CameraScreen = () => {
  const takePicture = async () => {
    const options = {
      quality: 0.8,
      base64: false,
      exif: true,
      writeExif: true,
    };
    
    const data = await camera.takePictureAsync(options);
    return data;
  };
};
```

### Redimensionamento de Imagens
```typescript
import ImageResizer from 'react-native-image-resizer';

const resizeImage = async (uri: string) => {
  const resized = await ImageResizer.createResizedImage(
    uri,
    1024, // width
    1024, // height
    'JPEG',
    80, // quality
    0, // rotation
    undefined, // outputPath
    false, // keepMeta
    {
      mode: 'contain',
      onlyScaleDown: true,
    }
  );
  
  return resized;
};
```

## 🔄 Sistema de Sincronização

### Estratégia de Sync
1. **Offline First**: Todas as operações funcionam offline
2. **Queue System**: Operações são enfileiradas para sync
3. **Conflict Resolution**: Resolução automática de conflitos
4. **Retry Logic**: Tentativas automáticas em caso de falha
5. **Incremental Sync**: Apenas dados modificados são sincronizados

### Implementação
```typescript
class SyncService {
  async syncToServer() {
    const pendingOperations = await this.getPendingOperations();
    
    for (const operation of pendingOperations) {
      try {
        await this.executeOperation(operation);
        await this.markAsSynced(operation.id);
      } catch (error) {
        await this.incrementRetryCount(operation.id);
      }
    }
  }
  
  async syncFromServer() {
    const lastSync = await this.getLastSyncTimestamp();
    const updates = await api.getUpdates(lastSync);
    
    for (const update of updates) {
      await this.applyUpdate(update);
    }
    
    await this.updateLastSyncTimestamp();
  }
}
```

## 🔐 Segurança

### Armazenamento Seguro
```typescript
import Keychain from 'react-native-keychain';

// Salvar credenciais
await Keychain.setInternetCredentials(
  'treeinspector',
  username,
  password
);

// Recuperar credenciais
const credentials = await Keychain.getInternetCredentials('treeinspector');
```

### Autenticação Biométrica
```typescript
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

const authenticateWithBiometrics = async () => {
  const { available } = await rnBiometrics.isSensorAvailable();
  
  if (available) {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Confirme sua identidade',
    });
    
    return success;
  }
  
  return false;
};
```

## 🧪 Testes

### Testes Unitários (Jest)
```bash
npm test
```

### Testes E2E (Detox)
```bash
# Android
npm run e2e:android

# iOS
npm run e2e:ios
```

### Estrutura de Testes
```
__tests__/
├── components/
├── hooks/
├── services/
├── utils/
└── screens/

e2e/
├── tests/
├── config.json
└── setup.js
```

## 📱 Build e Deploy

### Android APK
```bash
npm run build:android
```

### iOS Archive
```bash
npm run build:ios
```

### Release
```bash
# Android (Google Play)
cd android
./gradlew bundleRelease

# iOS (App Store)
# Usar Xcode para archive e upload
```

## 🔧 Scripts Disponíveis

- `npm start` - Metro bundler
- `npm run android` - Executar no Android
- `npm run ios` - Executar no iOS
- `npm test` - Testes unitários
- `npm run lint` - ESLint
- `npm run type-check` - TypeScript check
- `npm run clean` - Limpar cache
- `npm run build:android` - Build Android
- `npm run build:ios` - Build iOS

## 🐛 Debug

### Flipper Integration
- React Query Devtools
- Redux Devtools
- Network Inspector
- Database Inspector

### Remote Debugging
```bash
# Habilitar debug remoto
npm start -- --reset-cache
```

## 📚 Documentação

### Componentes
- Storybook para componentes UI
- Documentação inline com JSDoc
- Exemplos de uso

### API
- Swagger integration
- Offline API mock
- Error handling guide

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