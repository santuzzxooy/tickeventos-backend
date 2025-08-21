const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/models');

router.get('/health', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    
    // Obtener zona horaria de PostgreSQL
    const [result] = await sequelize.query("SELECT current_setting('TIMEZONE') as timezone");
    
    res.json({
      status: 'Operativo',
      environment: process.env.NODE_ENV || 'development',
      database: 'PostgreSQL (Conectado)',
      timezone: result[0]?.timezone || 'America/Bogota',
      nodeVersion: process.version,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      message: 'Problema con la base de datos',
      error: error.message
    });
  }
});

module.exports = router;