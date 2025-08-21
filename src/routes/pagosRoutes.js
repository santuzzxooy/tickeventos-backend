const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/crear-preferencia', authMiddleware, pagosController.crearPreferenciaPago);
router.post('/webhook', pagosController.webhookMercadoPago);

module.exports = router;