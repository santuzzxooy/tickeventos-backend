const express = require('express');
const router = express.Router();
const palcoController = require('../controllers/palcoController'); // Asegúrate de que la ruta al controlador sea correcta

// Rutas para los palcos
router.post('/', palcoController.create);
router.get('/:eventoId/disponibles', palcoController.getPalcosDisponibles);
router.get('/:id', palcoController.getPalcoById);

module.exports = router;