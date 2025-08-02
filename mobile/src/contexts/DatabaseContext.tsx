import React, { createContext, useContext, useEffect, useState } from 'react';
import DatabaseManager from '../database/DatabaseManager';

interface DatabaseContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  database: DatabaseManager | null;
  reinitialize: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [database, setDatabase] = useState<DatabaseManager | null>(null);

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const dbManager = DatabaseManager.getInstance();
      await dbManager.initializeDatabase();
      
      setDatabase(dbManager);
      setIsInitialized(true);
      console.log('✅ Database context initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
      setError(errorMessage);
      console.error('❌ Database initialization failed:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const reinitialize = async () => {
    setIsInitialized(false);
    await initializeDatabase();
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  const value: DatabaseContextType = {
    isInitialized,
    isLoading,
    error,
    database,
    reinitialize,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export default DatabaseContext;