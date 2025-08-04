import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { DatabaseManager } from '../database/DatabaseManager';
import { ApiService } from './ApiService';
import { logger } from '../utils/logger';

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // em minutos
  wifiOnly: boolean;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  uploaded: {
    trees: number;
    inspections: number;
    photos: number;
  };
  downloaded: {
    trees: number;
    inspections: number;
    photos: number;
    species: number;
  };
  conflicts: any[];
  errors: string[];
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync: string | null;
  nextSync: string | null;
  pendingUploads: number;
  autoSyncEnabled: boolean;
}

/**
 * Serviço de Sincronização para React Native
 * Gerencia sincronização bidirecional entre SQLite local e servidor PostgreSQL
 */
export class SyncService {
  private db: DatabaseManager;
  private api: ApiService;
  private deviceId: string;
  private syncInProgress: boolean = false;
  private syncConfig: SyncConfig;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(db: DatabaseManager, api: ApiService) {
    this.db = db;
    this.api = api;
    this.deviceId = '';
    this.syncConfig = {
      autoSync: true,
      syncInterval: 30, // 30 minutos
      wifiOnly: false,
      maxRetries: 3,
    };
    
    this.initializeDeviceId();
    this.loadSyncConfig();
  }

  /**
   * Inicializa ID único do dispositivo
   */
  private async initializeDeviceId(): Promise<void> {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      
      this.deviceId = deviceId;
      logger.info('Device ID initialized', { deviceId });
    } catch (error) {
      logger.error('Error initializing device ID', { error });
      this.deviceId = `temp_${Date.now()}`;
    }
  }

  /**
   * Carrega configuração de sincronização
   */
  private async loadSyncConfig(): Promise<void> {
    try {
      const configStr = await AsyncStorage.getItem('syncConfig');
      if (configStr) {
        this.syncConfig = { ...this.syncConfig, ...JSON.parse(configStr) };
      }
      
      if (this.syncConfig.autoSync) {
        this.startAutoSync();
      }
    } catch (error) {
      logger.error('Error loading sync config', { error });
    }
  }

  /**
   * Salva configuração de sincronização
   */
  async updateSyncConfig(config: Partial<SyncConfig>): Promise<void> {
    try {
      this.syncConfig = { ...this.syncConfig, ...config };
      await AsyncStorage.setItem('syncConfig', JSON.stringify(this.syncConfig));
      
      if (this.syncConfig.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
      
      logger.info('Sync config updated', { config: this.syncConfig });
    } catch (error) {
      logger.error('Error updating sync config', { error });
    }
  }

  /**
   * Inicia sincronização automática
   */
  private startAutoSync(): void {
    this.stopAutoSync(); // Para timer anterior se existir
    
    const intervalMs = this.syncConfig.syncInterval * 60 * 1000;
    this.syncTimer = setInterval(() => {
      this.syncIfConditionsMet();
    }, intervalMs);
    
    logger.info('Auto sync started', { intervalMinutes: this.syncConfig.syncInterval });
  }

  /**
   * Para sincronização automática
   */
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('Auto sync stopped');
    }
  }

  /**
   * Verifica condições e executa sincronização se apropriado
   */
  private async syncIfConditionsMet(): Promise<void> {
    try {
      if (this.syncInProgress) {
        logger.info('Sync already in progress, skipping');
        return;
      }

      // Verificar conectividade
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        logger.info('No internet connection, skipping sync');
        return;
      }

      // Verificar se deve usar apenas WiFi
      if (this.syncConfig.wifiOnly && netInfo.type !== 'wifi') {
        logger.info('WiFi only mode enabled, skipping sync on mobile data');
        return;
      }

      // Verificar se há dados pendentes
      const pendingCount = await this.getPendingUploadsCount();
      if (pendingCount === 0) {
        logger.info('No pending uploads, skipping sync');
        return;
      }

      // Executar sincronização
      await this.performSync();
    } catch (error) {
      logger.error('Error in auto sync', { error });
    }
  }

  /**
   * Executa sincronização manual
   */
  async performSync(forceSync: boolean = false): Promise<SyncResult> {
    if (this.syncInProgress && !forceSync) {
      throw new Error('Sincronização já está em andamento');
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      logger.info('Starting sync process', { deviceId: this.deviceId });

      // Verificar conectividade
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('Sem conexão com a internet');
      }

      // Obter timestamp da última sincronização
      const lastSync = await AsyncStorage.getItem('lastSyncTimestamp');

      // 1. Preparar dados para upload
      const uploadData = await this.prepareUploadData();

      // 2. Executar sincronização completa
      const response = await this.api.post('/sync/full', {
        deviceId: this.deviceId,
        lastSync,
        upload: uploadData,
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro na sincronização');
      }

      const syncResult: SyncResult = response.data;

      // 3. Processar dados baixados
      if (syncResult.downloaded) {
        await this.processDownloadedData(syncResult.downloaded);
      }

      // 4. Marcar dados como sincronizados
      await this.markDataAsSynced(uploadData);

      // 5. Salvar timestamp da sincronização
      await AsyncStorage.setItem('lastSyncTimestamp', syncResult.timestamp);

      // 6. Registrar estatísticas
      await this.recordSyncStats(syncResult);

      const duration = Date.now() - startTime;
      logger.info('Sync completed successfully', {
        deviceId: this.deviceId,
        duration,
        uploaded: syncResult.uploaded,
        downloaded: syncResult.downloaded,
        conflicts: syncResult.conflicts?.length || 0,
      });

      return syncResult;

    } catch (error) {
      logger.error('Sync failed', { 
        deviceId: this.deviceId, 
        error: error.message,
        duration: Date.now() - startTime 
      });

      const failedResult: SyncResult = {
        success: false,
        timestamp: new Date().toISOString(),
        uploaded: { trees: 0, inspections: 0, photos: 0 },
        downloaded: { trees: 0, inspections: 0, photos: 0, species: 0 },
        conflicts: [],
        errors: [error.message],
      };

      await this.recordSyncStats(failedResult);
      throw error;

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Prepara dados para upload
   */
  private async prepareUploadData(): Promise<any> {
    const uploadData = {
      trees: [],
      inspections: [],
      photos: [],
    };

    try {
      // Buscar árvores não sincronizadas
      const trees = await this.db.query(`
        SELECT * FROM trees 
        WHERE synced = 0 OR synced IS NULL
        ORDER BY created_at DESC
        LIMIT 100
      `);
      uploadData.trees = trees;

      // Buscar inspeções não sincronizadas
      const inspections = await this.db.query(`
        SELECT * FROM inspections 
        WHERE synced = 0 OR synced IS NULL
        ORDER BY created_at DESC
        LIMIT 200
      `);
      uploadData.inspections = inspections;

      // Buscar fotos não sincronizadas
      const photos = await this.db.query(`
        SELECT * FROM photos 
        WHERE synced = 0 OR synced IS NULL
        ORDER BY created_at DESC
        LIMIT 50
      `);
      uploadData.photos = photos;

      logger.info('Upload data prepared', {
        trees: uploadData.trees.length,
        inspections: uploadData.inspections.length,
        photos: uploadData.photos.length,
      });

      return uploadData;

    } catch (error) {
      logger.error('Error preparing upload data', { error });
      throw error;
    }
  }

  /**
   * Processa dados baixados do servidor
   */
  private async processDownloadedData(downloadedData: any): Promise<void> {
    try {
      // Processar árvores
      if (downloadedData.data?.trees?.length > 0) {
        await this.processDownloadedTrees(downloadedData.data.trees);
      }

      // Processar inspeções
      if (downloadedData.data?.inspections?.length > 0) {
        await this.processDownloadedInspections(downloadedData.data.inspections);
      }

      // Processar fotos
      if (downloadedData.data?.photos?.length > 0) {
        await this.processDownloadedPhotos(downloadedData.data.photos);
      }

      // Processar espécies
      if (downloadedData.data?.species?.length > 0) {
        await this.processDownloadedSpecies(downloadedData.data.species);
      }

      logger.info('Downloaded data processed successfully');

    } catch (error) {
      logger.error('Error processing downloaded data', { error });
      throw error;
    }
  }

  /**
   * Processa árvores baixadas
   */
  private async processDownloadedTrees(trees: any[]): Promise<void> {
    for (const tree of trees) {
      try {
        // Verificar se árvore já existe localmente
        const existing = await this.db.query(
          'SELECT id FROM trees WHERE server_id = ? OR mobile_id = ?',
          [tree.id, tree.mobile_id]
        );

        if (existing.length > 0) {
          // Atualizar árvore existente
          await this.db.query(`
            UPDATE trees SET
              species_id = ?, latitude = ?, longitude = ?, diameter_breast_height = ?,
              total_height = ?, crown_diameter = ?, location_description = ?,
              neighborhood = ?, updated_at = ?, synced = 1, server_id = ?
            WHERE id = ?
          `, [
            tree.species_id, tree.latitude, tree.longitude, tree.diameter_breast_height,
            tree.total_height, tree.crown_diameter, tree.location_description,
            tree.neighborhood, tree.updated_at, tree.id, existing[0].id
          ]);
        } else {
          // Inserir nova árvore
          await this.db.query(`
            INSERT INTO trees (
              server_id, mobile_id, species_id, latitude, longitude,
              diameter_breast_height, total_height, crown_diameter,
              location_description, neighborhood, created_at, updated_at, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            tree.id, tree.mobile_id, tree.species_id, tree.latitude, tree.longitude,
            tree.diameter_breast_height, tree.total_height, tree.crown_diameter,
            tree.location_description, tree.neighborhood, tree.created_at, tree.updated_at
          ]);
        }
      } catch (error) {
        logger.error('Error processing downloaded tree', { treeId: tree.id, error });
      }
    }
  }

  /**
   * Processa inspeções baixadas
   */
  private async processDownloadedInspections(inspections: any[]): Promise<void> {
    for (const inspection of inspections) {
      try {
        // Buscar árvore local correspondente
        const treeResult = await this.db.query(
          'SELECT id FROM trees WHERE server_id = ? OR mobile_id = ?',
          [inspection.tree_id, inspection.tree_mobile_id]
        );

        if (treeResult.length === 0) {
          logger.warn('Tree not found for inspection', { inspectionId: inspection.id });
          continue;
        }

        const localTreeId = treeResult[0].id;

        // Verificar se inspeção já existe
        const existing = await this.db.query(
          'SELECT id FROM inspections WHERE server_id = ? OR mobile_id = ?',
          [inspection.id, inspection.mobile_id]
        );

        if (existing.length > 0) {
          // Atualizar inspeção existente
          await this.db.query(`
            UPDATE inspections SET
              tree_id = ?, inspection_date = ?, trunk_condition = ?, root_condition = ?,
              crown_condition = ?, branch_condition = ?, pest_severity = ?, disease_severity = ?,
              general_health = ?, recommendations = ?, notes = ?, updated_at = ?,
              synced = 1, server_id = ?
            WHERE id = ?
          `, [
            localTreeId, inspection.inspection_date, inspection.trunk_condition,
            inspection.root_condition, inspection.crown_condition, inspection.branch_condition,
            inspection.pest_severity, inspection.disease_severity, inspection.general_health,
            inspection.recommendations, inspection.notes, inspection.updated_at,
            inspection.id, existing[0].id
          ]);
        } else {
          // Inserir nova inspeção
          await this.db.query(`
            INSERT INTO inspections (
              server_id, mobile_id, tree_id, inspection_date, trunk_condition,
              root_condition, crown_condition, branch_condition, pest_severity,
              disease_severity, general_health, recommendations, notes,
              created_at, updated_at, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            inspection.id, inspection.mobile_id, localTreeId, inspection.inspection_date,
            inspection.trunk_condition, inspection.root_condition, inspection.crown_condition,
            inspection.branch_condition, inspection.pest_severity, inspection.disease_severity,
            inspection.general_health, inspection.recommendations, inspection.notes,
            inspection.created_at, inspection.updated_at
          ]);
        }
      } catch (error) {
        logger.error('Error processing downloaded inspection', { inspectionId: inspection.id, error });
      }
    }
  }

  /**
   * Processa fotos baixadas
   */
  private async processDownloadedPhotos(photos: any[]): Promise<void> {
    for (const photo of photos) {
      try {
        // Verificar se foto já existe
        const existing = await this.db.query(
          'SELECT id FROM photos WHERE server_id = ? OR file_hash = ?',
          [photo.id, photo.file_hash]
        );

        if (existing.length > 0) {
          continue; // Foto já existe
        }

        // Buscar inspeção local correspondente
        let localInspectionId = null;
        if (photo.inspection_mobile_id) {
          const inspectionResult = await this.db.query(
            'SELECT id FROM inspections WHERE server_id = ? OR mobile_id = ?',
            [photo.inspection_id, photo.inspection_mobile_id]
          );
          
          if (inspectionResult.length > 0) {
            localInspectionId = inspectionResult[0].id;
          }
        }

        // Inserir nova foto
        await this.db.query(`
          INSERT INTO photos (
            server_id, mobile_id, inspection_id, category, file_path,
            file_name, file_size, file_hash, latitude, longitude,
            taken_at, created_at, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          photo.id, photo.mobile_id, localInspectionId, photo.category,
          photo.file_path, photo.file_name, photo.file_size, photo.file_hash,
          photo.latitude, photo.longitude, photo.taken_at, photo.created_at
        ]);

      } catch (error) {
        logger.error('Error processing downloaded photo', { photoId: photo.id, error });
      }
    }
  }

  /**
   * Processa espécies baixadas
   */
  private async processDownloadedSpecies(species: any[]): Promise<void> {
    for (const specie of species) {
      try {
        // Verificar se espécie já existe
        const existing = await this.db.query(
          'SELECT id FROM species WHERE server_id = ? OR scientific_name = ?',
          [specie.id, specie.scientific_name]
        );

        if (existing.length > 0) {
          // Atualizar espécie existente
          await this.db.query(`
            UPDATE species SET
              scientific_name = ?, common_name = ?, family = ?, genus = ?,
              updated_at = ?, synced = 1, server_id = ?
            WHERE id = ?
          `, [
            specie.scientific_name, specie.common_name, specie.family,
            specie.genus, specie.updated_at, specie.id, existing[0].id
          ]);
        } else {
          // Inserir nova espécie
          await this.db.query(`
            INSERT INTO species (
              server_id, scientific_name, common_name, family, genus,
              created_at, updated_at, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            specie.id, specie.scientific_name, specie.common_name,
            specie.family, specie.genus, specie.created_at, specie.updated_at
          ]);
        }
      } catch (error) {
        logger.error('Error processing downloaded species', { speciesId: specie.id, error });
      }
    }
  }

  /**
   * Marca dados como sincronizados
   */
  private async markDataAsSynced(uploadData: any): Promise<void> {
    try {
      // Marcar árvores como sincronizadas
      for (const tree of uploadData.trees) {
        await this.db.query(
          'UPDATE trees SET synced = 1 WHERE mobile_id = ?',
          [tree.mobile_id]
        );
      }

      // Marcar inspeções como sincronizadas
      for (const inspection of uploadData.inspections) {
        await this.db.query(
          'UPDATE inspections SET synced = 1 WHERE mobile_id = ?',
          [inspection.mobile_id]
        );
      }

      // Marcar fotos como sincronizadas
      for (const photo of uploadData.photos) {
        await this.db.query(
          'UPDATE photos SET synced = 1 WHERE mobile_id = ?',
          [photo.mobile_id]
        );
      }

      logger.info('Data marked as synced successfully');

    } catch (error) {
      logger.error('Error marking data as synced', { error });
    }
  }

  /**
   * Registra estatísticas de sincronização
   */
  private async recordSyncStats(syncResult: SyncResult): Promise<void> {
    try {
      const stats = {
        timestamp: syncResult.timestamp,
        success: syncResult.success,
        uploaded: syncResult.uploaded,
        downloaded: syncResult.downloaded,
        conflicts: syncResult.conflicts?.length || 0,
        errors: syncResult.errors?.length || 0,
      };

      await AsyncStorage.setItem('lastSyncStats', JSON.stringify(stats));
      logger.info('Sync stats recorded', stats);

    } catch (error) {
      logger.error('Error recording sync stats', { error });
    }
  }

  /**
   * Obtém contagem de uploads pendentes
   */
  async getPendingUploadsCount(): Promise<number> {
    try {
      const results = await Promise.all([
        this.db.query('SELECT COUNT(*) as count FROM trees WHERE synced = 0 OR synced IS NULL'),
        this.db.query('SELECT COUNT(*) as count FROM inspections WHERE synced = 0 OR synced IS NULL'),
        this.db.query('SELECT COUNT(*) as count FROM photos WHERE synced = 0 OR synced IS NULL'),
      ]);

      const total = results.reduce((sum, result) => sum + (result[0]?.count || 0), 0);
      return total;

    } catch (error) {
      logger.error('Error getting pending uploads count', { error });
      return 0;
    }
  }

  /**
   * Obtém status atual da sincronização
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const lastSync = await AsyncStorage.getItem('lastSyncTimestamp');
      const pendingUploads = await this.getPendingUploadsCount();
      
      let nextSync = null;
      if (this.syncConfig.autoSync && lastSync) {
        const lastSyncTime = new Date(lastSync);
        const nextSyncTime = new Date(lastSyncTime.getTime() + (this.syncConfig.syncInterval * 60 * 1000));
        nextSync = nextSyncTime.toISOString();
      }

      return {
        isRunning: this.syncInProgress,
        lastSync,
        nextSync,
        pendingUploads,
        autoSyncEnabled: this.syncConfig.autoSync,
      };

    } catch (error) {
      logger.error('Error getting sync status', { error });
      return {
        isRunning: false,
        lastSync: null,
        nextSync: null,
        pendingUploads: 0,
        autoSyncEnabled: false,
      };
    }
  }

  /**
   * Limpa dados de sincronização (reset)
   */
  async resetSyncData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'lastSyncTimestamp',
        'lastSyncStats',
        'syncConfig'
      ]);

      // Marcar todos os dados como não sincronizados
      await this.db.query('UPDATE trees SET synced = 0, server_id = NULL');
      await this.db.query('UPDATE inspections SET synced = 0, server_id = NULL');
      await this.db.query('UPDATE photos SET synced = 0, server_id = NULL');
      await this.db.query('UPDATE species SET synced = 0, server_id = NULL');

      logger.info('Sync data reset successfully');

    } catch (error) {
      logger.error('Error resetting sync data', { error });
      throw error;
    }
  }

  /**
   * Cleanup - para ser chamado quando o serviço não for mais usado
   */
  cleanup(): void {
    this.stopAutoSync();
    logger.info('SyncService cleanup completed');
  }
}

export default SyncService;