import { PermissionsAndroid, Platform, Alert } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  message?: string;
}

export class PermissionManager {
  /**
   * Solicita todas as permissões necessárias para o app
   */
  static async requestAllPermissions(): Promise<PermissionResult> {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          const deniedPermissions = Object.entries(granted)
            .filter(([_, result]) => result !== PermissionsAndroid.RESULTS.GRANTED)
            .map(([permission]) => permission);

          return {
            granted: false,
            message: `Permissões negadas: ${deniedPermissions.join(', ')}`,
          };
        }

        return { granted: true };
      }

      // iOS - permissões são solicitadas automaticamente quando necessário
      return { granted: true };
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return {
        granted: false,
        message: 'Erro ao solicitar permissões',
      };
    }
  }

  /**
   * Solicita permissões de localização
   */
  static async requestLocationPermissions(): Promise<PermissionResult> {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const fineLocationGranted = 
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 
          PermissionsAndroid.RESULTS.GRANTED;

        const coarseLocationGranted = 
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 
          PermissionsAndroid.RESULTS.GRANTED;

        if (!fineLocationGranted && !coarseLocationGranted) {
          return {
            granted: false,
            message: 'Permissão de localização negada',
          };
        }

        return { granted: true };
      }

      return { granted: true };
    } catch (error) {
      console.error('Erro ao solicitar permissões de localização:', error);
      return {
        granted: false,
        message: 'Erro ao solicitar permissões de localização',
      };
    }
  }

  /**
   * Solicita permissões de câmera
   */
  static async requestCameraPermissions(): Promise<PermissionResult> {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const cameraGranted = 
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === 
          PermissionsAndroid.RESULTS.GRANTED;

        if (!cameraGranted) {
          return {
            granted: false,
            message: 'Permissão de câmera negada',
          };
        }

        return { granted: true };
      }

      return { granted: true };
    } catch (error) {
      console.error('Erro ao solicitar permissões de câmera:', error);
      return {
        granted: false,
        message: 'Erro ao solicitar permissões de câmera',
      };
    }
  }

  /**
   * Verifica se uma permissão específica foi concedida
   */
  static async checkPermission(permission: string): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.check(permission);
        return result;
      }
      return true; // iOS
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Mostra alerta explicativo sobre permissões
   */
  static showPermissionAlert(
    title: string,
    message: string,
    onRetry?: () => void
  ): void {
    const buttons = [
      { text: 'Cancelar', style: 'cancel' as const },
    ];

    if (onRetry) {
      buttons.push({
        text: 'Tentar Novamente',
        onPress: onRetry,
      });
    }

    Alert.alert(title, message, buttons);
  }

  /**
   * Mostra alerta para ir às configurações
   */
  static showSettingsAlert(): void {
    Alert.alert(
      'Permissões Necessárias',
      'Para usar todas as funcionalidades do TreeInspector, você precisa conceder as permissões necessárias nas configurações do dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ir para Configurações', onPress: () => {
          // TODO: Implementar abertura das configurações
          console.log('Abrir configurações do app');
        }},
      ]
    );
  }

  /**
   * Solicita permissões com explicação contextual
   */
  static async requestPermissionsWithExplanation(): Promise<PermissionResult> {
    return new Promise((resolve) => {
      Alert.alert(
        'Permissões Necessárias',
        'O TreeInspector precisa de acesso à localização e câmera para:\n\n' +
        '• 📍 Registrar a localização precisa das árvores\n' +
        '• 📸 Capturar fotos durante as inspeções\n' +
        '• 💾 Salvar dados localmente para uso offline\n\n' +
        'Essas permissões são essenciais para o funcionamento do app.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve({ granted: false, message: 'Usuário cancelou' }),
          },
          {
            text: 'Conceder Permissões',
            onPress: async () => {
              const result = await this.requestAllPermissions();
              resolve(result);
            },
          },
        ]
      );
    });
  }

  /**
   * Verifica se todas as permissões essenciais foram concedidas
   */
  static async checkEssentialPermissions(): Promise<{
    location: boolean;
    camera: boolean;
    storage: boolean;
  }> {
    if (Platform.OS === 'ios') {
      return {
        location: true,
        camera: true,
        storage: true,
      };
    }

    const [location, camera, storage] = await Promise.all([
      this.checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
      this.checkPermission(PermissionsAndroid.PERMISSIONS.CAMERA),
      this.checkPermission(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE),
    ]);

    return {
      location,
      camera,
      storage,
    };
  }

  /**
   * Solicita permissões faltantes
   */
  static async requestMissingPermissions(): Promise<PermissionResult> {
    const permissions = await this.checkEssentialPermissions();
    const missing = [];

    if (!permissions.location) {
      missing.push('Localização');
    }
    if (!permissions.camera) {
      missing.push('Câmera');
    }
    if (!permissions.storage) {
      missing.push('Armazenamento');
    }

    if (missing.length === 0) {
      return { granted: true };
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Permissões Faltantes',
        `As seguintes permissões são necessárias: ${missing.join(', ')}\n\n` +
        'Deseja conceder essas permissões agora?',
        [
          {
            text: 'Não',
            style: 'cancel',
            onPress: () => resolve({ 
              granted: false, 
              message: `Permissões faltantes: ${missing.join(', ')}` 
            }),
          },
          {
            text: 'Sim',
            onPress: async () => {
              const result = await this.requestAllPermissions();
              resolve(result);
            },
          },
        ]
      );
    });
  }
}

export default PermissionManager;