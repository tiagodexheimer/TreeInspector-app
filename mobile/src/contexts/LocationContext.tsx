import React, { createContext, useContext, useEffect, useState } from 'react';
import LocationService, { LocationCoordinates } from '../services/LocationService';

interface LocationContextType {
  currentLocation: LocationCoordinates | null;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
  accuracy: number | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<LocationCoordinates>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const locationService = LocationService.getInstance();

  useEffect(() => {
    checkPermission();
    return () => {
      if (watchId !== null) {
        locationService.stopLocationTracking();
      }
    };
  }, []);

  const checkPermission = async () => {
    try {
      const permission = await locationService.requestLocationPermission();
      setHasPermission(permission);
    } catch (err) {
      console.error('Error checking location permission:', err);
      setHasPermission(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const permission = await locationService.requestLocationPermission();
      setHasPermission(permission);
      return permission;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission request failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<LocationCoordinates> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const location = await locationService.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });
      
      setCurrentLocation(location);
      setAccuracy(location.accuracy || null);
      
      console.log('📍 Location updated:', location);
      return location;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const startTracking = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!hasPermission) {
        const permission = await requestPermission();
        if (!permission) {
          throw new Error('Location permission denied');
        }
      }

      const id = await locationService.startLocationTracking(
        (location: LocationCoordinates) => {
          setCurrentLocation(location);
          setAccuracy(location.accuracy || null);
          console.log('📍 Location tracking update:', location);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
          distanceFilter: 1, // Update every 1 meter
        }
      );

      setWatchId(id);
      setIsTracking(true);
      console.log('📍 Location tracking started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(errorMessage);
      console.error('❌ Location tracking error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const stopTracking = (): void => {
    if (watchId !== null) {
      locationService.stopLocationTracking();
      setWatchId(null);
      setIsTracking(false);
      console.log('📍 Location tracking stopped');
    }
  };

  const value: LocationContextType = {
    currentLocation,
    isTracking,
    isLoading,
    error,
    accuracy,
    startTracking,
    stopTracking,
    getCurrentLocation,
    hasPermission,
    requestPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;