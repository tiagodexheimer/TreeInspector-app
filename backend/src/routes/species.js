const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const PlantNetService = require('../services/PlantNetService');
const GBIFService = require('../services/GBIFService');
const logger = require('../utils/logger');

const router = express.Router();

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/species');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `species-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 5, // Máximo 5 arquivos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPEG, JPG e PNG são permitidas'));
    }
  }
});

// Instanciar serviços
const plantNetService = new PlantNetService();
const gbifService = new GBIFService();

/**
 * @swagger
 * /api/v1/species/identify:
 *   post:
 *     summary: Identifica espécie através de fotos usando PlantNet
 *     tags: [Species]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               organs:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [leaf, flower, fruit, bark, auto]
 *               project:
 *                 type: string
 *                 default: weurope
 *               maxResults:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Identificação realizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido
 */
router.post('/identify', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos uma imagem é necessária'
      });
    }

    // Preparar dados das imagens
    const images = req.files.map((file, index) => ({
      path: file.path,
      organ: req.body.organs ? req.body.organs[index] : 'auto'
    }));

    // Opções de identificação
    const options = {
      project: req.body.project || 'weurope',
      maxResults: parseInt(req.body.maxResults) || 10,
      language: req.body.language || 'pt',
      includeRelatedImages: req.body.includeRelatedImages === 'true',
    };

    // Identificar espécie
    const result = await plantNetService.identifySpecies(images, options);

    // Limpar arquivos temporários
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) logger.error('Error deleting temp file:', err);
      });
    });

    logger.info('Species identification completed', {
      userId: req.user.id,
      imagesCount: images.length,
      speciesFound: result.species.length
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    // Limpar arquivos em caso de erro
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) logger.error('Error deleting temp file:', err);
        });
      });
    }

    logger.error('Species identification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/species/search:
 *   get:
 *     summary: Busca espécies por nome científico usando GBIF
 *     tags: [Species]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome científico ou parte do nome
 *       - in: query
 *         name: rank
 *         schema:
 *           type: string
 *           enum: [SPECIES, GENUS, FAMILY]
 *           default: SPECIES
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Busca realizada com sucesso
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Token inválido
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, rank, limit, offset } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetro de busca (q) é obrigatório'
      });
    }

    const options = {
      rank: rank || 'SPECIES',
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    };

    const result = await gbifService.searchSpeciesByName(q, options);

    logger.info('Species search completed', {
      userId: req.user.id,
      query: q,
      resultsCount: result.results.length
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Species search error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/species/{speciesKey}:
 *   get:
 *     summary: Obtém detalhes de uma espécie por ID do GBIF
 *     tags: [Species]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speciesKey
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chave da espécie no GBIF
 *     responses:
 *       200:
 *         description: Detalhes da espécie
 *       404:
 *         description: Espécie não encontrada
 *       401:
 *         description: Token inválido
 */
router.get('/:speciesKey', authenticateToken, async (req, res) => {
  try {
    const { speciesKey } = req.params;

    if (!speciesKey || isNaN(speciesKey)) {
      return res.status(400).json({
        success: false,
        message: 'ID da espécie inválido'
      });
    }

    const result = await gbifService.getSpeciesDetails(parseInt(speciesKey));

    logger.info('Species details retrieved', {
      userId: req.user.id,
      speciesKey,
      scientificName: result.scientificName
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Species details error:', error);
    
    if (error.message.includes('não encontrada')) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
});

/**
 * @swagger
 * /api/v1/species/{speciesKey}/occurrences:
 *   get:
 *     summary: Obtém ocorrências de uma espécie
 *     tags: [Species]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: speciesKey
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Código do país (ex: BR)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Ocorrências da espécie
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Token inválido
 */
router.get('/:speciesKey/occurrences', authenticateToken, async (req, res) => {
  try {
    const { speciesKey } = req.params;
    const { country, limit, offset } = req.query;

    if (!speciesKey || isNaN(speciesKey)) {
      return res.status(400).json({
        success: false,
        message: 'ID da espécie inválido'
      });
    }

    const options = {
      country,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    };

    const result = await gbifService.getSpeciesOccurrences(parseInt(speciesKey), options);

    logger.info('Species occurrences retrieved', {
      userId: req.user.id,
      speciesKey,
      occurrencesCount: result.results.length
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Species occurrences error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/species/location:
 *   get:
 *     summary: Busca espécies por localização geográfica
 *     tags: [Species]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Raio em quilômetros
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Espécies encontradas na região
 *       400:
 *         description: Coordenadas inválidas
 *       401:
 *         description: Token inválido
 */
router.get('/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, radius, limit } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude e longitude são obrigatórias'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas inválidas'
      });
    }

    const options = {
      limit: parseInt(limit) || 100,
    };

    const result = await gbifService.getSpeciesByLocation(
      lat, 
      lng, 
      parseFloat(radius) || 10, 
      options
    );

    logger.info('Species by location retrieved', {
      userId: req.user.id,
      location: `${lat}, ${lng}`,
      radius: parseFloat(radius) || 10,
      speciesCount: result.speciesCount
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Species by location error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/species/projects:
 *   get:
 *     summary: Lista projetos disponíveis no PlantNet
 *     tags: [Species]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de projetos
 *       401:
 *         description: Token inválido
 */
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await plantNetService.getAvailableProjects();

    logger.info('PlantNet projects retrieved', {
      userId: req.user.id,
      projectsCount: projects.length
    });

    res.json({
      success: true,
      data: projects
    });

  } catch (error) {
    logger.error('PlantNet projects error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/species/status:
 *   get:
 *     summary: Verifica status das APIs externas
 *     tags: [Species]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status das APIs
 *       401:
 *         description: Token inválido
 */
router.get('/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const [plantNetStatus, gbifStatus] = await Promise.allSettled([
      plantNetService.getApiStatus(),
      gbifService.getApiStatus(),
    ]);

    const status = {
      plantNet: plantNetStatus.status === 'fulfilled' ? plantNetStatus.value : { status: 'error', error: plantNetStatus.reason?.message },
      gbif: gbifStatus.status === 'fulfilled' ? gbifStatus.value : { status: 'error', error: gbifStatus.reason?.message },
      timestamp: new Date().toISOString(),
    };

    logger.info('External APIs status checked', {
      userId: req.user.id,
      plantNetStatus: status.plantNet.status,
      gbifStatus: status.gbif.status
    });

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('APIs status check error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;