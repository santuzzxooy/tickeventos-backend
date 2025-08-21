const express = require('express');
const router = express.Router();

const paqueteController = require('../controllers/paqueteController');
const { authControlMiddleware } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const validatePaquete = require('../middlewares/paqueteMiddleware');
const validateTipoTicketEnEtapa = require('../middlewares/validateTipoTicketEnEtapa');

// Solo administradores pueden crear paquetes
router.post('/create', authControlMiddleware, isAdmin, validatePaquete, validateTipoTicketEnEtapa, paqueteController.create);

router.get('/getall', authControlMiddleware, isAdmin, paqueteController.getAll);
router.put('/:id/toggle-visibility', authControlMiddleware, paqueteController.toggleVisibility);
router.get('/findpaquetesbyevento/:eventoId', paqueteController.findPaquetesByEvento);

module.exports = router;