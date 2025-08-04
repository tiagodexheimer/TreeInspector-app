const logger = require('../utils/logger');

/**
 * Serviço de Sincronização de Dados
 * Gerencia a sincronização bidirecional entre app móvel (SQLite) e backend (PostgreSQL)
 */
class SyncService {
  constructor(db) {
    this.db = db;
    this.syncTables = [
      'trees',
      'inspections', 
      'photos',
      'species',
      'risk_assessments',
      'users'
    ];
  }

  /**
   * Processa sincronização completa de um dispositivo
   * @param {Object} syncData - Dados de sincronização do dispositivo
   * @param {string} userId - ID do usuário
   * @param {string} deviceId - ID do dispositivo
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async processSyncRequest(syncData, userId, deviceId) {
    const transaction = await this.db.transaction();
    
    try {
      const syncResult = {
        deviceId,
        userId,
        timestamp: new Date().toISOString(),
        uploaded: {
          trees: 0,
          inspections: 0,
          photos: 0,
          conflicts: 0
        },
        downloaded: {
          trees: 0,
          inspections: 0,
          photos: 0,
          species: 0
        },
        conflicts: [],
        errors: []
      };

      // 1. Upload de dados do dispositivo para servidor
      if (syncData.upload) {
        const uploadResult = await this.processUpload(syncData.upload, userId, deviceId, transaction);
        syncResult.uploaded = uploadResult.uploaded;
        syncResult.conflicts = uploadResult.conflicts;
      }

      // 2. Download de dados do servidor para dispositivo
      const downloadResult = await this.processDownload(syncData.lastSync, userId, transaction);
      syncResult.downloaded = downloadResult;

      // 3. Registrar sincronização
      await this.recordSyncSession(userId, deviceId, syncResult, transaction);

      await transaction.commit();

      logger.info('Sync completed successfully', {
        userId,
        deviceId,
        uploaded: syncResult.uploaded,
        downloaded: syncResult.downloaded,
        conflicts: syncResult.conflicts.length
      });

      return syncResult;

    } catch (error) {
      await transaction.rollback();
      logger.error('Sync failed', { userId, deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Processa upload de dados do dispositivo
   * @param {Object} uploadData - Dados para upload
   * @param {string} userId - ID do usuário
   * @param {string} deviceId - ID do dispositivo
   * @param {Object} transaction - Transação do banco
   * @returns {Promise<Object>} Resultado do upload
   */
  async processUpload(uploadData, userId, deviceId, transaction) {
    const result = {
      uploaded: { trees: 0, inspections: 0, photos: 0, conflicts: 0 },
      conflicts: []
    };

    // Upload de árvores
    if (uploadData.trees && uploadData.trees.length > 0) {
      const treeResult = await this.uploadTrees(uploadData.trees, userId, deviceId, transaction);
      result.uploaded.trees = treeResult.uploaded;
      result.conflicts.push(...treeResult.conflicts);
    }

    // Upload de inspeções
    if (uploadData.inspections && uploadData.inspections.length > 0) {
      const inspectionResult = await this.uploadInspections(uploadData.inspections, userId, deviceId, transaction);
      result.uploaded.inspections = inspectionResult.uploaded;
      result.conflicts.push(...inspectionResult.conflicts);
    }

    // Upload de fotos
    if (uploadData.photos && uploadData.photos.length > 0) {
      const photoResult = await this.uploadPhotos(uploadData.photos, userId, deviceId, transaction);
      result.uploaded.photos = photoResult.uploaded;
      result.conflicts.push(...photoResult.conflicts);
    }

    result.uploaded.conflicts = result.conflicts.length;
    return result;
  }

  /**
   * Upload de árvores
   * @param {Array} trees - Lista de árvores
   * @param {string} userId - ID do usuário
   * @param {string} deviceId - ID do dispositivo
   * @param {Object} transaction - Transação
   * @returns {Promise<Object>} Resultado
   */
  async uploadTrees(trees, userId, deviceId, transaction) {
    let uploaded = 0;
    const conflicts = [];

    for (const tree of trees) {
      try {
        // Verificar se já existe
        const existing = await this.db.query(
          'SELECT id, updated_at FROM trees WHERE mobile_id = ? OR (latitude = ? AND longitude = ?)',
          [tree.mobile_id, tree.latitude, tree.longitude],
          { transaction }
        );

        if (existing.length > 0) {
          // Verificar conflito de versão
          const serverTree = existing[0];
          const serverTime = new Date(serverTree.updated_at);
          const mobileTime = new Date(tree.updated_at);

          if (serverTime > mobileTime) {
            conflicts.push({
              type: 'tree',
              mobile_id: tree.mobile_id,
              server_id: serverTree.id,
              reason: 'Server version is newer',
              resolution: 'keep_server'
            });
            continue;
          }

          // Atualizar árvore existente
          await this.db.query(`
            UPDATE trees SET
              species_id = ?, diameter_breast_height = ?, total_height = ?,
              crown_diameter = ?, location_description = ?, neighborhood = ?,
              updated_at = ?, updated_by = ?
            WHERE id = ?
          `, [
            tree.species_id, tree.diameter_breast_height, tree.total_height,
            tree.crown_diameter, tree.location_description, tree.neighborhood,
            new Date(), userId, serverTree.id
          ], { transaction });

        } else {
          // Inserir nova árvore
          await this.db.query(`
            INSERT INTO trees (
              mobile_id, species_id, latitude, longitude, diameter_breast_height,
              total_height, crown_diameter, location_description, neighborhood,
              created_at, created_by, updated_at, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            tree.mobile_id, tree.species_id, tree.latitude, tree.longitude,
            tree.diameter_breast_height, tree.total_height, tree.crown_diameter,
            tree.location_description, tree.neighborhood,
            tree.created_at, userId, new Date(), userId
          ], { transaction });
        }

        uploaded++;

      } catch (error) {
        logger.error('Error uploading tree', { 
          mobile_id: tree.mobile_id, 
          error: error.message 
        });
        conflicts.push({
          type: 'tree',
          mobile_id: tree.mobile_id,
          reason: error.message,
          resolution: 'error'
        });
      }
    }

    return { uploaded, conflicts };
  }

  /**
   * Upload de inspeções
   * @param {Array} inspections - Lista de inspeções
   * @param {string} userId - ID do usuário
   * @param {string} deviceId - ID do dispositivo
   * @param {Object} transaction - Transação
   * @returns {Promise<Object>} Resultado
   */
  async uploadInspections(inspections, userId, deviceId, transaction) {
    let uploaded = 0;
    const conflicts = [];

    for (const inspection of inspections) {
      try {
        // Buscar ID da árvore no servidor
        const treeResult = await this.db.query(
          'SELECT id FROM trees WHERE mobile_id = ?',
          [inspection.tree_mobile_id],
          { transaction }
        );

        if (treeResult.length === 0) {
          conflicts.push({
            type: 'inspection',
            mobile_id: inspection.mobile_id,
            reason: 'Tree not found on server',
            resolution: 'skip'
          });
          continue;
        }

        const treeId = treeResult[0].id;

        // Verificar se inspeção já existe
        const existing = await this.db.query(
          'SELECT id, updated_at FROM inspections WHERE mobile_id = ?',
          [inspection.mobile_id],
          { transaction }
        );

        if (existing.length > 0) {
          // Verificar conflito de versão
          const serverInspection = existing[0];
          const serverTime = new Date(serverInspection.updated_at);
          const mobileTime = new Date(inspection.updated_at);

          if (serverTime > mobileTime) {
            conflicts.push({
              type: 'inspection',
              mobile_id: inspection.mobile_id,
              server_id: serverInspection.id,
              reason: 'Server version is newer',
              resolution: 'keep_server'
            });
            continue;
          }

          // Atualizar inspeção existente
          await this.updateInspection(serverInspection.id, inspection, userId, transaction);
        } else {
          // Inserir nova inspeção
          await this.insertInspection(treeId, inspection, userId, transaction);
        }

        uploaded++;

      } catch (error) {
        logger.error('Error uploading inspection', { 
          mobile_id: inspection.mobile_id, 
          error: error.message 
        });
        conflicts.push({
          type: 'inspection',
          mobile_id: inspection.mobile_id,
          reason: error.message,
          resolution: 'error'
        });
      }
    }

    return { uploaded, conflicts };
  }

  /**
   * Upload de fotos
   * @param {Array} photos - Lista de fotos
   * @param {string} userId - ID do usuário
   * @param {string} deviceId - ID do dispositivo
   * @param {Object} transaction - Transação
   * @returns {Promise<Object>} Resultado
   */
  async uploadPhotos(photos, userId, deviceId, transaction) {
    let uploaded = 0;
    const conflicts = [];

    for (const photo of photos) {
      try {
        // Verificar se foto já existe
        const existing = await this.db.query(
          'SELECT id FROM photos WHERE mobile_id = ? OR file_hash = ?',
          [photo.mobile_id, photo.file_hash],
          { transaction }
        );

        if (existing.length > 0) {
          conflicts.push({
            type: 'photo',
            mobile_id: photo.mobile_id,
            reason: 'Photo already exists',
            resolution: 'skip'
          });
          continue;
        }

        // Buscar ID da inspeção no servidor
        let inspectionId = null;
        if (photo.inspection_mobile_id) {
          const inspectionResult = await this.db.query(
            'SELECT id FROM inspections WHERE mobile_id = ?',
            [photo.inspection_mobile_id],
            { transaction }
          );
          
          if (inspectionResult.length > 0) {
            inspectionId = inspectionResult[0].id;
          }
        }

        // Inserir foto
        await this.db.query(`
          INSERT INTO photos (
            mobile_id, inspection_id, category, file_path, file_name,
            file_size, file_hash, latitude, longitude, taken_at,
            created_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          photo.mobile_id, inspectionId, photo.category, photo.file_path,
          photo.file_name, photo.file_size, photo.file_hash,
          photo.latitude, photo.longitude, photo.taken_at,
          new Date(), userId
        ], { transaction });

        uploaded++;

      } catch (error) {
        logger.error('Error uploading photo', { 
          mobile_id: photo.mobile_id, 
          error: error.message 
        });
        conflicts.push({
          type: 'photo',
          mobile_id: photo.mobile_id,
          reason: error.message,
          resolution: 'error'
        });
      }
    }

    return { uploaded, conflicts };
  }

  /**
   * Processa download de dados para o dispositivo
   * @param {string} lastSync - Timestamp da última sincronização
   * @param {string} userId - ID do usuário
   * @param {Object} transaction - Transação
   * @returns {Promise<Object>} Dados para download
   */
  async processDownload(lastSync, userId, transaction) {
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date('1970-01-01');
    
    const downloadData = {
      trees: 0,
      inspections: 0,
      photos: 0,
      species: 0,
      data: {
        trees: [],
        inspections: [],
        photos: [],
        species: []
      }
    };

    // Download de árvores atualizadas
    const trees = await this.db.query(`
      SELECT * FROM trees 
      WHERE updated_at > ? 
      ORDER BY updated_at DESC
      LIMIT 1000
    `, [lastSyncDate], { transaction });

    downloadData.data.trees = trees;
    downloadData.trees = trees.length;

    // Download de inspeções atualizadas
    const inspections = await this.db.query(`
      SELECT i.*, t.mobile_id as tree_mobile_id
      FROM inspections i
      JOIN trees t ON i.tree_id = t.id
      WHERE i.updated_at > ?
      ORDER BY i.updated_at DESC
      LIMIT 1000
    `, [lastSyncDate], { transaction });

    downloadData.data.inspections = inspections;
    downloadData.inspections = inspections.length;

    // Download de fotos atualizadas
    const photos = await this.db.query(`
      SELECT p.*, i.mobile_id as inspection_mobile_id
      FROM photos p
      LEFT JOIN inspections i ON p.inspection_id = i.id
      WHERE p.created_at > ?
      ORDER BY p.created_at DESC
      LIMIT 500
    `, [lastSyncDate], { transaction });

    downloadData.data.photos = photos;
    downloadData.photos = photos.length;

    // Download de espécies (sempre as mais recentes)
    const species = await this.db.query(`
      SELECT * FROM species 
      WHERE updated_at > ?
      ORDER BY updated_at DESC
      LIMIT 100
    `, [lastSyncDate], { transaction });

    downloadData.data.species = species;
    downloadData.species = species.length;

    return downloadData;
  }

  /**
   * Insere nova inspeção
   * @param {number} treeId - ID da árvore
   * @param {Object} inspection - Dados da inspeção
   * @param {string} userId - ID do usuário
   * @param {Object} transaction - Transação
   */
  async insertInspection(treeId, inspection, userId, transaction) {
    await this.db.query(`
      INSERT INTO inspections (
        mobile_id, tree_id, inspector_id, inspection_date,
        trunk_condition, root_condition, crown_condition, branch_condition,
        pest_severity, disease_severity, general_health,
        recommendations, notes, created_at, created_by, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inspection.mobile_id, treeId, userId, inspection.inspection_date,
      inspection.trunk_condition, inspection.root_condition, 
      inspection.crown_condition, inspection.branch_condition,
      inspection.pest_severity, inspection.disease_severity, inspection.general_health,
      inspection.recommendations, inspection.notes,
      inspection.created_at, userId, new Date(), userId
    ], { transaction });
  }

  /**
   * Atualiza inspeção existente
   * @param {number} inspectionId - ID da inspeção
   * @param {Object} inspection - Dados da inspeção
   * @param {string} userId - ID do usuário
   * @param {Object} transaction - Transação
   */
  async updateInspection(inspectionId, inspection, userId, transaction) {
    await this.db.query(`
      UPDATE inspections SET
        trunk_condition = ?, root_condition = ?, crown_condition = ?, branch_condition = ?,
        pest_severity = ?, disease_severity = ?, general_health = ?,
        recommendations = ?, notes = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `, [
      inspection.trunk_condition, inspection.root_condition,
      inspection.crown_condition, inspection.branch_condition,
      inspection.pest_severity, inspection.disease_severity, inspection.general_health,
      inspection.recommendations, inspection.notes, new Date(), userId,
      inspectionId
    ], { transaction });
  }

  /**
   * Registra sessão de sincronização
   * @param {string} userId - ID do usuário
   * @param {string} deviceId - ID do dispositivo
   * @param {Object} syncResult - Resultado da sincronização
   * @param {Object} transaction - Transação
   */
  async recordSyncSession(userId, deviceId, syncResult, transaction) {
    await this.db.query(`
      INSERT INTO sync_sessions (
        user_id, device_id, sync_timestamp, uploaded_trees, uploaded_inspections,
        uploaded_photos, downloaded_trees, downloaded_inspections, downloaded_photos,
        conflicts_count, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, deviceId, syncResult.timestamp,
      syncResult.uploaded.trees, syncResult.uploaded.inspections, syncResult.uploaded.photos,
      syncResult.downloaded.trees, syncResult.downloaded.inspections, syncResult.downloaded.photos,
      syncResult.conflicts.length, 'completed'
    ], { transaction });
  }

  /**
   * Obtém estatísticas de sincronização
   * @param {string} userId - ID do usuário
   * @param {string} deviceId - ID do dispositivo (opcional)
   * @returns {Promise<Object>} Estatísticas
   */
  async getSyncStats(userId, deviceId = null) {
    const whereClause = deviceId ? 'WHERE user_id = ? AND device_id = ?' : 'WHERE user_id = ?';
    const params = deviceId ? [userId, deviceId] : [userId];

    const stats = await this.db.query(`
      SELECT 
        COUNT(*) as total_syncs,
        MAX(sync_timestamp) as last_sync,
        SUM(uploaded_trees) as total_uploaded_trees,
        SUM(uploaded_inspections) as total_uploaded_inspections,
        SUM(conflicts_count) as total_conflicts,
        AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_rate
      FROM sync_sessions
      ${whereClause}
    `, params);

    return stats[0] || {
      total_syncs: 0,
      last_sync: null,
      total_uploaded_trees: 0,
      total_uploaded_inspections: 0,
      total_conflicts: 0,
      success_rate: 0
    };
  }

  /**
   * Resolve conflito de sincronização
   * @param {string} conflictId - ID do conflito
   * @param {string} resolution - Resolução ('keep_server', 'keep_mobile', 'merge')
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Resultado da resolução
   */
  async resolveConflict(conflictId, resolution, userId) {
    // Implementação da resolução de conflitos
    // Esta seria uma funcionalidade avançada para resolver conflitos manualmente
    logger.info('Conflict resolution requested', { conflictId, resolution, userId });
    
    return {
      conflictId,
      resolution,
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
      status: 'resolved'
    };
  }
}

module.exports = SyncService;