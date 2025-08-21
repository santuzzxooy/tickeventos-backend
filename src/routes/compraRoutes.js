const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const compraController = require('../controllers/compraController');

// Obtener todas las compras del usuario
router.get('/', authMiddleware, compraController.obtenerComprasUsuario);

// Obtener detalles de una compra específica
router.get('/:id', authMiddleware, compraController.obtenerDetalleCompra);

// Obtener solo el estado de una compra (útil para polling)
router.get('/:id/estado', authMiddleware, compraController.obtenerEstadoCompra);

module.exports = router;