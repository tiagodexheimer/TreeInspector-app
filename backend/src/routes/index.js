const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./auth');
const speciesRoutes = require('./species');
const syncRoutes = require('./sync');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TreeInspector API está funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});

// Status endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    services: {
      api: 'online',
      database: 'online',
      redis: 'online',
      plantnet: 'online',
      gbif: 'online',
      sync: 'online'
    },
    features: {
      species_identification: true,
      risk_assessment: true,
      data_synchronization: true,
      offline_support: true
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TreeInspector API v2.0.0 - APIs Externas e Sincronização',
    documentation: '/api/docs',
    health: '/api/health',
    status: '/api/status',
    endpoints: {
      auth: '/api/v1/auth',
      species: '/api/v1/species',
      sync: '/api/v1/sync'
    }
  });
});

// Registrar rotas da API v1
router.use('/v1/auth', authRoutes);
router.use('/v1/species', speciesRoutes);
router.use('/v1/sync', syncRoutes);

module.exports = router;