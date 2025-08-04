const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ReportService = require('../services/ReportService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v1/reports/inspection/{inspectionId}/pdf:
 *   post:
 *     summary: Gera relatório PDF de uma inspeção específica
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inspectionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da inspeção
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includePhotos:
 *                 type: boolean
 *                 default: true
 *               template:
 *                 type: string
 *                 enum: [standard, detailed, summary]
 *                 default: standard
 *     responses:
 *       200:
 *         description: Relatório PDF gerado com sucesso
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Inspeção não encontrada
 *       401:
 *         description: Token inválido
 */
router.post('/inspection/:inspectionId/pdf', authenticateToken, async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const options = {
      includePhotos: req.body.includePhotos !== false,
      template: req.body.template || 'standard',
      ...req.body
    };

    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);

    // Gerar relatório PDF
    const filePath = await reportService.generateInspectionPDF(
      parseInt(inspectionId), 
      options
    );

    // Verificar se arquivo foi criado
    if (!fs.existsSync(filePath)) {
      throw new Error('Falha ao gerar arquivo PDF');
    }

    const fileName = path.basename(filePath);
    
    logger.info('Inspection PDF report generated', {
      inspectionId,
      userId: req.user.id,
      fileName,
      options
    });

    // Enviar arquivo como download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Limpar arquivo após envio (opcional)
    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000); // 5 segundos de delay
    });

  } catch (error) {
    logger.error('Error generating inspection PDF report', {
      inspectionId: req.params.inspectionId,
      userId: req.user.id,
      error: error.message
    });

    if (error.message.includes('não encontrada')) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório PDF'
      });
    }
  }
});

/**
 * @swagger
 * /api/v1/reports/consolidated/csv:
 *   post:
 *     summary: Gera relatório consolidado em CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               inspectorId:
 *                 type: integer
 *               riskLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               neighborhood:
 *                 type: string
 *               limit:
 *                 type: integer
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Relatório CSV gerado com sucesso
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Token inválido
 */
router.post('/consolidated/csv', authenticateToken, async (req, res) => {
  try {
    const filters = {
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      inspectorId: req.body.inspectorId,
      riskLevel: req.body.riskLevel,
      neighborhood: req.body.neighborhood,
      limit: req.body.limit || 1000
    };

    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);

    // Gerar relatório CSV
    const filePath = await reportService.generateConsolidatedCSV(filters);

    // Verificar se arquivo foi criado
    if (!fs.existsSync(filePath)) {
      throw new Error('Falha ao gerar arquivo CSV');
    }

    const fileName = path.basename(filePath);
    
    logger.info('Consolidated CSV report generated', {
      userId: req.user.id,
      fileName,
      filters
    });

    // Enviar arquivo como download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Limpar arquivo após envio
    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });

  } catch (error) {
    logger.error('Error generating consolidated CSV report', {
      userId: req.user.id,
      filters: req.body,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório CSV'
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/dashboard:
 *   post:
 *     summary: Gera relatório de dashboard com gráficos
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [week, month, quarter, year]
 *                 default: month
 *               format:
 *                 type: string
 *                 enum: [pdf, csv]
 *                 default: pdf
 *               includeCharts:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Relatório de dashboard gerado
 *       401:
 *         description: Token inválido
 */
router.post('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { period = 'month', format = 'pdf', includeCharts = true } = req.body;

    // Calcular datas baseado no período
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const filters = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit: 10000
    };

    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);

    let filePath;
    let contentType;
    
    if (format === 'csv') {
      filePath = await reportService.generateConsolidatedCSV(filters);
      contentType = 'text/csv; charset=utf-8';
    } else {
      // Para PDF, usar método específico de dashboard (a ser implementado)
      filePath = await reportService.generateConsolidatedCSV(filters);
      contentType = 'text/csv; charset=utf-8';
    }

    const fileName = path.basename(filePath);
    
    logger.info('Dashboard report generated', {
      userId: req.user.id,
      period,
      format,
      fileName
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });

  } catch (error) {
    logger.error('Error generating dashboard report', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de dashboard'
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/list:
 *   get:
 *     summary: Lista relatórios gerados
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PDF, CSV, all]
 *           default: all
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de relatórios
 *       401:
 *         description: Token inválido
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { type = 'all', limit = 50 } = req.query;

    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);

    // Listar relatórios
    let reports = await reportService.listReports();

    // Filtrar por tipo se especificado
    if (type !== 'all') {
      reports = reports.filter(report => report.type === type.toUpperCase());
    }

    // Limitar resultados
    reports = reports.slice(0, parseInt(limit));

    logger.info('Reports listed', {
      userId: req.user.id,
      type,
      count: reports.length
    });

    res.json({
      success: true,
      data: {
        reports,
        count: reports.length
      }
    });

  } catch (error) {
    logger.error('Error listing reports', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao listar relatórios'
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/{fileName}/download:
 *   get:
 *     summary: Download de relatório específico
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo
 *     responses:
 *       200:
 *         description: Arquivo do relatório
 *       404:
 *         description: Arquivo não encontrado
 *       401:
 *         description: Token inválido
 */
router.get('/:fileName/download', authenticateToken, async (req, res) => {
  try {
    const { fileName } = req.params;

    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);
    const filePath = path.join(reportService.reportsDir, fileName);

    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    // Determinar tipo de conteúdo
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.csv') {
      contentType = 'text/csv; charset=utf-8';
    }

    logger.info('Report downloaded', {
      userId: req.user.id,
      fileName
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    logger.error('Error downloading report', {
      userId: req.user.id,
      fileName: req.params.fileName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao baixar relatório'
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/{fileName}:
 *   delete:
 *     summary: Remove relatório específico
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo
 *     responses:
 *       200:
 *         description: Relatório removido com sucesso
 *       404:
 *         description: Arquivo não encontrado
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Permissão negada
 */
router.delete('/:fileName', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { fileName } = req.params;

    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);

    // Remover relatório
    const deleted = await reportService.deleteReport(fileName);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    logger.info('Report deleted', {
      userId: req.user.id,
      fileName
    });

    res.json({
      success: true,
      message: 'Relatório removido com sucesso'
    });

  } catch (error) {
    logger.error('Error deleting report', {
      userId: req.user.id,
      fileName: req.params.fileName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao remover relatório'
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/cleanup:
 *   post:
 *     summary: Limpa relatórios antigos (apenas admin)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 default: 30
 *                 minimum: 1
 *                 maximum: 365
 *     responses:
 *       200:
 *         description: Limpeza realizada com sucesso
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Permissão negada
 */
router.post('/cleanup', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    // Validar parâmetro
    if (daysToKeep < 1 || daysToKeep > 365) {
      return res.status(400).json({
        success: false,
        message: 'Dias para manter deve estar entre 1 e 365'
      });
    }

    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);

    // Limpar relatórios antigos
    const deletedCount = await reportService.cleanupOldReports(daysToKeep);

    logger.info('Reports cleanup completed', {
      userId: req.user.id,
      daysToKeep,
      deletedCount
    });

    res.json({
      success: true,
      data: {
        deletedCount,
        daysToKeep,
        message: `${deletedCount} relatórios antigos foram removidos`
      }
    });

  } catch (error) {
    logger.error('Error cleaning up reports', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao limpar relatórios antigos'
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/statistics:
 *   get:
 *     summary: Estatísticas de relatórios
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas dos relatórios
 *       401:
 *         description: Token inválido
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    // Instanciar serviço de relatórios
    const reportService = new ReportService(req.db);

    // Obter lista de relatórios
    const reports = await reportService.listReports();

    // Calcular estatísticas
    const stats = {
      totalReports: reports.length,
      pdfReports: reports.filter(r => r.type === 'PDF').length,
      csvReports: reports.filter(r => r.type === 'CSV').length,
      totalSize: reports.reduce((sum, r) => sum + r.size, 0),
      oldestReport: reports.length > 0 ? reports[reports.length - 1].createdAt : null,
      newestReport: reports.length > 0 ? reports[0].createdAt : null,
      averageSize: reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + r.size, 0) / reports.length) : 0
    };

    logger.info('Report statistics retrieved', {
      userId: req.user.id,
      stats
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting report statistics', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de relatórios'
    });
  }
});

module.exports = router;