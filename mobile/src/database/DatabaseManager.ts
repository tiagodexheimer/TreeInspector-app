import SQLite from 'react-native-sqlite-storage';
import { Platform } from 'react-native';

// Configuração do SQLite
SQLite.DEBUG(false);
SQLite.enablePromise(true);

export interface DatabaseConfig {
  name: string;
  version: string;
  displayName: string;
  size: number;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private database: SQLite.SQLiteDatabase | null = null;
  private config: DatabaseConfig;

  private constructor() {
    this.config = {
      name: 'treeinspector_mobile.db',
      version: '1.0',
      displayName: 'TreeInspector Mobile Database',
      size: 200000,
    };
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initializeDatabase(): Promise<void> {
    try {
      console.log('🗄️ Inicializando banco de dados SQLite...');
      
      this.database = await SQLite.openDatabase({
        name: this.config.name,
        location: Platform.OS === 'ios' ? 'Library' : 'default',
        createFromLocation: undefined,
      });

      console.log('✅ Banco de dados conectado com sucesso');
      await this.createTables();
      await this.runMigrations();
      
    } catch (error) {
      console.error('❌ Erro ao inicializar banco de dados:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database não inicializado');
    }

    const tables = [
      // Tabela de usuários locais
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      )`,

      // Tabela de espécies
      `CREATE TABLE IF NOT EXISTS species (
        id TEXT PRIMARY KEY,
        scientific_name TEXT NOT NULL,
        common_name TEXT,
        family TEXT,
        characteristics TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      )`,

      // Tabela de árvores
      `CREATE TABLE IF NOT EXISTS trees (
        id TEXT PRIMARY KEY,
        species_id TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        altitude REAL,
        accuracy REAL,
        diameter_breast_height REAL,
        total_height REAL,
        crown_diameter REAL,
        trunk_circumference REAL,
        age_estimate INTEGER,
        health_status TEXT,
        location_description TEXT,
        address TEXT,
        neighborhood TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (species_id) REFERENCES species (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Tabela de inspeções
      `CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        inspector_id TEXT NOT NULL,
        inspection_date TEXT NOT NULL,
        inspection_type TEXT NOT NULL,
        weather_conditions TEXT,
        temperature REAL,
        humidity REAL,
        wind_speed REAL,
        
        -- Avaliação estrutural
        trunk_condition TEXT,
        trunk_defects TEXT,
        root_condition TEXT,
        root_defects TEXT,
        crown_condition TEXT,
        crown_defects TEXT,
        branch_condition TEXT,
        branch_defects TEXT,
        
        -- Avaliação fitossanitária
        pest_presence TEXT,
        disease_presence TEXT,
        pest_severity INTEGER,
        disease_severity INTEGER,
        
        -- Avaliação de risco ABNT
        risk_level INTEGER NOT NULL,
        risk_factors TEXT,
        probability_failure INTEGER,
        consequence_failure INTEGER,
        risk_matrix_result INTEGER,
        
        -- Recomendações
        recommendations TEXT,
        priority_level INTEGER,
        next_inspection_date TEXT,
        
        -- Observações
        general_observations TEXT,
        equipment_used TEXT,
        
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (tree_id) REFERENCES trees (id),
        FOREIGN KEY (inspector_id) REFERENCES users (id)
      )`,

      // Tabela de fotos
      `CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        inspection_id TEXT,
        tree_id TEXT,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        width INTEGER,
        height INTEGER,
        latitude REAL,
        longitude REAL,
        timestamp TEXT NOT NULL,
        photo_type TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id),
        FOREIGN KEY (tree_id) REFERENCES trees (id)
      )`,

      // Tabela de medições
      `CREATE TABLE IF NOT EXISTS measurements (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        measurement_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        method TEXT,
        equipment TEXT,
        accuracy REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id)
      )`,

      // Tabela de queue de sincronização
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        error_message TEXT,
        status TEXT DEFAULT 'pending'
      )`,

      // Tabela de configurações
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Tabela de logs
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        timestamp TEXT NOT NULL
      )`
    ];

    for (const tableSQL of tables) {
      await this.database.executeSql(tableSQL);
    }

    console.log('✅ Tabelas criadas com sucesso');
  }

  private async runMigrations(): Promise<void> {
    // Implementar migrações futuras aqui
    console.log('✅ Migrações executadas');
  }

  public async executeQuery(
    sql: string,
    params: any[] = []
  ): Promise<SQLite.ResultSet> {
    if (!this.database) {
      throw new Error('Database não inicializado');
    }

    try {
      const [result] = await this.database.executeSql(sql, params);
      return result;
    } catch (error) {
      console.error('❌ Erro ao executar query:', error);
      throw error;
    }
  }

  public async transaction(
    callback: (tx: SQLite.Transaction) => Promise<void>
  ): Promise<void> {
    if (!this.database) {
      throw new Error('Database não inicializado');
    }

    return new Promise((resolve, reject) => {
      this.database!.transaction(
        async (tx) => {
          try {
            await callback(tx);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          console.error('❌ Erro na transação:', error);
          reject(error);
        }
      );
    });
  }

  public async closeDatabase(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
      console.log('✅ Banco de dados fechado');
    }
  }

  public async clearAllData(): Promise<void> {
    if (!this.database) {
      throw new Error('Database não inicializado');
    }

    const tables = [
      'logs',
      'sync_queue',
      'measurements',
      'photos',
      'inspections',
      'trees',
      'species',
      'users'
    ];

    for (const table of tables) {
      await this.database.executeSql(`DELETE FROM ${table}`);
    }

    console.log('✅ Todos os dados foram limpos');
  }

  public getDatabase(): SQLite.SQLiteDatabase | null {
    return this.database;
  }
}

export default DatabaseManager;