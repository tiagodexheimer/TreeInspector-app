'use client';

import React, { createContext, useContext, useState } from 'react';

interface MapSettings {
  center: [number, number]; // [lat, lng]
  zoom: number;
  style: string;
}

interface MapContextType {
  mapSettings: MapSettings;
  setMapSettings: (settings: Partial<MapSettings>) => void;
  selectedTree: string | null;
  setSelectedTree: (treeId: string | null) => void;
  mapProvider: 'mapbox' | 'leaflet';
  setMapProvider: (provider: 'mapbox' | 'leaflet') => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: React.ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const [mapSettings, setMapSettingsState] = useState<MapSettings>({
    center: [-23.5505, -46.6333], // São Paulo, SP
    zoom: 12,
    style: 'streets-v11',
  });

  const [selectedTree, setSelectedTree] = useState<string | null>(null);
  const [mapProvider, setMapProvider] = useState<'mapbox' | 'leaflet'>('mapbox');

  const setMapSettings = (settings: Partial<MapSettings>) => {
    setMapSettingsState(prev => ({ ...prev, ...settings }));
  };

  const value = {
    mapSettings,
    setMapSettings,
    selectedTree,
    setSelectedTree,
    mapProvider,
    setMapProvider,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap deve ser usado dentro de um MapProvider');
  }
  return context;
}