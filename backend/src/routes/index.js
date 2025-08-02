const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TreeInspector API está funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Status endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    services: {
      api: 'online',
      database: 'offline (desenvolvimento)',
      redis: 'offline (desenvolvimento)'
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TreeInspector API v1.0.0',
    documentation: '/api/docs',
    health: '/api/health',
    status: '/api/status'
  });
});

module.exports = router;