const express = require('express');
const router = express.Router();
const { authControlMiddleware } = require('../middlewares/authMiddleware');
const estadisticaController = require('../controllers/estadisticaController');

// Ruta para obtener estadísticas de un evento específico
router.get('/evento/:eventoId', authControlMiddleware, estadisticaController.getEventStatistics);

router.get('/ingreso/:eventoId', authControlMiddleware, estadisticaController.getIngresoStatistics);

module.exports = router;