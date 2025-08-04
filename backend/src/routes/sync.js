const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const SyncService = require('../services/SyncService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v1/sync/upload:
 *   post:
 *     summary: Sincroniza dados do dispositivo móvel para o servidor
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: ID único do dispositivo
 *               lastSync:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp da última sincronização
 *               upload:
 *                 type: object
 *                 properties:
 *                   trees:
 *                     type: array
 *                     items:
 *                       type: object
 *                   inspections:
 *                     type: array
 *                     items:
 *                       type: object
 *                   photos:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       200:
 *         description: Sincronização realizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido
 */
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const { deviceId, lastSync, upload } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID é obrigatório'
      });
    }

    // Validar dados de upload
    if (!upload || typeof upload !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Dados de upload inválidos'
      });
    }

    // Instanciar serviço de sincronização
    const syncService = new SyncService(req.db);

    // Processar sincronização
    const syncResult = await syncService.processSyncRequest(
      { upload, lastSync },
      userId,
      deviceId
    );

    logger.info('Sync upload completed', {
      userId,
      deviceId,
      uploaded: syncResult.uploaded,
      conflicts: syncResult.conflicts.length
    });

    res.json({
      success: true,
      data: syncResult
    });

  } catch (error) {
    logger.error('Sync upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/download:
 *   get:
 *     summary: Baixa dados atualizados do servidor para o dispositivo
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do dispositivo
 *       - in: query
 *         name: lastSync
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Timestamp da última sincronização
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Limite de registros por tabela
 *     responses:
 *       200:
 *         description: Dados para download
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Token inválido
 */
router.get('/download', authenticateToken, async (req, res) => {
  try {
    const { deviceId, lastSync, limit } = req.query;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID é obrigatório'
      });
    }

    // Instanciar serviço de sincronização
    const syncService = new SyncService(req.db);

    // Processar download
    const downloadData = await syncService.processDownload(
      lastSync,
      userId,
      null // transaction será criada internamente se necessário
    );

    logger.info('Sync download completed', {
      userId,
      deviceId,
      downloaded: {
        trees: downloadData.trees,
        inspections: downloadData.inspections,
        photos: downloadData.photos,
        species: downloadData.species
      }
    });

    res.json({
      success: true,
      data: downloadData
    });

  } catch (error) {
    logger.error('Sync download error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/full:
 *   post:
 *     summary: Sincronização completa (upload + download)
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *               lastSync:
 *                 type: string
 *                 format: date-time
 *               upload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Sincronização completa realizada
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido
 */
router.post('/full', authenticateToken, async (req, res) => {
  try {
    const { deviceId, lastSync, upload } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID é obrigatório'
      });
    }

    // Instanciar serviço de sincronização
    const syncService = new SyncService(req.db);

    // Processar sincronização completa
    const syncResult = await syncService.processSyncRequest(
      { upload, lastSync },
      userId,
      deviceId
    );

    logger.info('Full sync completed', {
      userId,
      deviceId,
      uploaded: syncResult.uploaded,
      downloaded: syncResult.downloaded,
      conflicts: syncResult.conflicts.length
    });

    res.json({
      success: true,
      data: syncResult
    });

  } catch (error) {
    logger.error('Full sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/status:
 *   get:
 *     summary: Obtém status e estatísticas de sincronização
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: ID do dispositivo (opcional)
 *     responses:
 *       200:
 *         description: Estatísticas de sincronização
 *       401:
 *         description: Token inválido
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const userId = req.user.id;

    // Instanciar serviço de sincronização
    const syncService = new SyncService(req.db);

    // Obter estatísticas
    const stats = await syncService.getSyncStats(userId, deviceId);

    logger.info('Sync status retrieved', {
      userId,
      deviceId,
      totalSyncs: stats.total_syncs
    });

    res.json({
      success: true,
      data: {
        userId,
        deviceId,
        statistics: stats,
        serverTime: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/conflicts:
 *   get:
 *     summary: Lista conflitos de sincronização pendentes
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: ID do dispositivo
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, resolved, all]
 *           default: pending
 *     responses:
 *       200:
 *         description: Lista de conflitos
 *       401:
 *         description: Token inválido
 */
router.get('/conflicts', authenticateToken, async (req, res) => {
  try {
    const { deviceId, status = 'pending' } = req.query;
    const userId = req.user.id;

    // Query para buscar conflitos
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];

    if (deviceId) {
      whereClause += ' AND device_id = ?';
      params.push(deviceId);
    }

    if (status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const conflicts = await req.db.query(`
      SELECT 
        id, device_id, conflict_type, mobile_id, server_id,
        conflict_reason, status, created_at, resolved_at, resolved_by
      FROM sync_conflicts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `, params);

    logger.info('Sync conflicts retrieved', {
      userId,
      deviceId,
      conflictsCount: conflicts.length
    });

    res.json({
      success: true,
      data: {
        conflicts,
        count: conflicts.length
      }
    });

  } catch (error) {
    logger.error('Sync conflicts error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/conflicts/{conflictId}/resolve:
 *   post:
 *     summary: Resolve um conflito de sincronização
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conflictId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [keep_server, keep_mobile, merge]
 *               mergeData:
 *                 type: object
 *                 description: Dados mesclados (se resolution = merge)
 *     responses:
 *       200:
 *         description: Conflito resolvido
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido
 *       404:
 *         description: Conflito não encontrado
 */
router.post('/conflicts/:conflictId/resolve', authenticateToken, async (req, res) => {
  try {
    const { conflictId } = req.params;
    const { resolution, mergeData } = req.body;
    const userId = req.user.id;

    if (!['keep_server', 'keep_mobile', 'merge'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: 'Resolução inválida'
      });
    }

    // Instanciar serviço de sincronização
    const syncService = new SyncService(req.db);

    // Resolver conflito
    const result = await syncService.resolveConflict(conflictId, resolution, userId);

    logger.info('Sync conflict resolved', {
      conflictId,
      resolution,
      userId
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Sync conflict resolution error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/history:
 *   get:
 *     summary: Histórico de sincronizações
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: ID do dispositivo
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Histórico de sincronizações
 *       401:
 *         description: Token inválido
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { deviceId, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    let whereClause = 'WHERE user_id = ?';
    let params = [userId];

    if (deviceId) {
      whereClause += ' AND device_id = ?';
      params.push(deviceId);
    }

    params.push(parseInt(limit), parseInt(offset));

    const history = await req.db.query(`
      SELECT 
        id, device_id, sync_timestamp, uploaded_trees, uploaded_inspections,
        uploaded_photos, downloaded_trees, downloaded_inspections, downloaded_photos,
        conflicts_count, status, duration_ms
      FROM sync_sessions
      ${whereClause}
      ORDER BY sync_timestamp DESC
      LIMIT ? OFFSET ?
    `, params);

    // Contar total de registros
    const countResult = await req.db.query(`
      SELECT COUNT(*) as total
      FROM sync_sessions
      ${whereClause}
    `, params.slice(0, -2)); // Remove limit e offset

    logger.info('Sync history retrieved', {
      userId,
      deviceId,
      historyCount: history.length
    });

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          total: countResult[0].total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: countResult[0].total > (parseInt(offset) + parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Sync history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/reset:
 *   post:
 *     summary: Reset de sincronização (apenas admin)
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *               resetType:
 *                 type: string
 *                 enum: [soft, hard]
 *                 description: soft = limpar histórico, hard = limpar dados
 *     responses:
 *       200:
 *         description: Reset realizado
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Permissão negada
 */
router.post('/reset', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { deviceId, resetType = 'soft' } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID é obrigatório'
      });
    }

    const transaction = await req.db.transaction();

    try {
      if (resetType === 'soft') {
        // Limpar apenas histórico de sincronização
        await req.db.query(
          'DELETE FROM sync_sessions WHERE device_id = ?',
          [deviceId],
          { transaction }
        );
        
        await req.db.query(
          'DELETE FROM sync_conflicts WHERE device_id = ?',
          [deviceId],
          { transaction }
        );
      } else if (resetType === 'hard') {
        // Limpar dados do dispositivo (cuidado!)
        await req.db.query(
          'UPDATE trees SET mobile_id = NULL WHERE mobile_id LIKE ?',
          [`${deviceId}%`],
          { transaction }
        );
        
        await req.db.query(
          'UPDATE inspections SET mobile_id = NULL WHERE mobile_id LIKE ?',
          [`${deviceId}%`],
          { transaction }
        );
        
        await req.db.query(
          'UPDATE photos SET mobile_id = NULL WHERE mobile_id LIKE ?',
          [`${deviceId}%`],
          { transaction }
        );
      }

      await transaction.commit();

      logger.warn('Sync reset performed', {
        deviceId,
        resetType,
        performedBy: userId
      });

      res.json({
        success: true,
        data: {
          deviceId,
          resetType,
          resetAt: new Date().toISOString(),
          performedBy: userId
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    logger.error('Sync reset error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;