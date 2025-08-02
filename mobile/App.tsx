/**
 * TreeInspector Mobile App
 * Sistema móvel para inspeção de árvores urbanas
 * 
 * @format
 */

import React, { useEffect } from 'react';
import {
  StatusBar,
  LogBox,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import SplashScreen from 'react-native-splash-screen';
import { enableScreens } from 'react-native-screens';
import 'react-native-gesture-handler';

// Providers e Contextos
import { AuthProvider } from './src/contexts/AuthContext';
import { DatabaseProvider } from './src/contexts/DatabaseContext';
import { SyncProvider } from './src/contexts/SyncContext';
import { LocationProvider } from './src/contexts/LocationContext';

// Navegação
import { AppNavigator } from './src/navigation/AppNavigator';

// Configurações
import { theme } from './src/config/theme';
import { queryClient } from './src/config/queryClient';

// Utilitários
import { initializeApp } from './src/utils/initialization';
import { requestPermissions } from './src/utils/permissions';

// Habilitar telas nativas para melhor performance
enableScreens();

// Suprimir warnings específicos do desenvolvimento
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'VirtualizedLists should never be nested',
    'Setting a timer for a long period of time',
  ]);
}

const App: React.FC = () => {
  useEffect(() => {
    const initApp = async () => {
      try {
        // Solicitar permissões necessárias
        await requestPermissions();
        
        // Inicializar banco de dados local e configurações
        await initializeApp();
        
        // Ocultar splash screen após inicialização
        if (Platform.OS === 'android') {
          SplashScreen.hide();
        }
      } catch (error) {
        console.error('Erro na inicialização do app:', error);
        Toast.show({
          type: 'error',
          text1: 'Erro de Inicialização',
          text2: 'Falha ao inicializar o aplicativo',
        });
      }
    };

    initApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <DatabaseProvider>
          <AuthProvider>
            <SyncProvider>
              <LocationProvider>
                <NavigationContainer>
                  <StatusBar
                    barStyle="dark-content"
                    backgroundColor={theme.colors.surface}
                    translucent={false}
                  />
                  <AppNavigator />
                  <Toast />
                </NavigationContainer>
              </LocationProvider>
            </SyncProvider>
          </AuthProvider>
        </DatabaseProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
};

export default App;