import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  distanceFilter?: number;
}

export class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private currentLocation: LocationCoordinates | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Solicita permissões de localização
   */
  public async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineLocationGranted = 
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 
          PermissionsAndroid.RESULTS.GRANTED;

        const coarseLocationGranted = 
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 
          PermissionsAndroid.RESULTS.GRANTED;

        if (!fineLocationGranted && !coarseLocationGranted) {
          Alert.alert(
            'Permissão Necessária',
            'O TreeInspector precisa de acesso à localização para registrar a posição das árvores.',
            [{ text: 'OK' }]
          );
          return false;
        }

        return true;
      }

      // iOS - permissões são solicitadas automaticamente
      return true;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão de localização:', error);
      return false;
    }
  }

  /**
   * Obtém a localização atual
   */
  public async getCurrentLocation(
    options: LocationOptions = {}
  ): Promise<LocationCoordinates> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Permissão de localização negada');
    }

    const defaultOptions: LocationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
      ...options,
    };

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const coordinates: LocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || undefined,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          this.currentLocation = coordinates;
          console.log('📍 Localização obtida:', coordinates);
          resolve(coordinates);
        },
        (error) => {
          console.error('❌ Erro ao obter localização:', error);
          
          let errorMessage = 'Erro desconhecido ao obter localização';
          switch (error.code) {
            case 1:
              errorMessage = 'Permissão de localização negada';
              break;
            case 2:
              errorMessage = 'Localização indisponível';
              break;
            case 3:
              errorMessage = 'Timeout ao obter localização';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }

  /**
   * Inicia o monitoramento contínuo da localização
   */
  public startLocationTracking(
    callback: (location: LocationCoordinates) => void,
    options: LocationOptions = {}
  ): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        reject(new Error('Permissão de localização negada'));
        return;
      }

      const defaultOptions: LocationOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        distanceFilter: 1, // metros
        ...options,
      };

      this.watchId = Geolocation.watchPosition(
        (position) => {
          const coordinates: LocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || undefined,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          this.currentLocation = coordinates;
          callback(coordinates);
        },
        (error) => {
          console.error('❌ Erro no tracking de localização:', error);
          reject(error);
        },
        defaultOptions
      );

      resolve(this.watchId);
    });
  }

  /**
   * Para o monitoramento de localização
   */
  public stopLocationTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('📍 Tracking de localização parado');
    }
  }

  /**
   * Retorna a última localização conhecida
   */
  public getLastKnownLocation(): LocationCoordinates | null {
    return this.currentLocation;
  }

  /**
   * Calcula a distância entre duas coordenadas (em metros)
   */
  public calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Verifica se a localização tem precisão adequada
   */
  public isLocationAccurate(
    location: LocationCoordinates,
    maxAccuracy: number = 10
  ): boolean {
    return location.accuracy ? location.accuracy <= maxAccuracy : false;
  }

  /**
   * Formata coordenadas para exibição
   */
  public formatCoordinates(
    location: LocationCoordinates,
    precision: number = 6
  ): string {
    return `${location.latitude.toFixed(precision)}, ${location.longitude.toFixed(precision)}`;
  }

  /**
   * Converte coordenadas para diferentes formatos
   */
  public convertToDMS(coordinate: number, isLatitude: boolean): string {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    const direction = isLatitude
      ? coordinate >= 0 ? 'N' : 'S'
      : coordinate >= 0 ? 'E' : 'W';

    return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
  }

  /**
   * Obtém informações de endereço por geocoding reverso
   */
  public async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<any> {
    try {
      // Implementar integração com serviço de geocoding
      // Por enquanto, retorna um mock
      return {
        address: 'Endereço não disponível',
        neighborhood: '',
        city: '',
        state: '',
        postalCode: '',
      };
    } catch (error) {
      console.error('❌ Erro no geocoding reverso:', error);
      throw error;
    }
  }

  /**
   * Valida se as coordenadas estão dentro de limites válidos
   */
  public validateCoordinates(
    latitude: number,
    longitude: number
  ): boolean {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }
}

export default LocationService;