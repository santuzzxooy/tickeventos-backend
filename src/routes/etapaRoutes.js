const express = require('express');
const router = express.Router();
const etapaController = require('../controllers/etapaController');
const etapaMiddleware = require('../middlewares/etapaMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const { authControlMiddleware } = require('../middlewares/authMiddleware');

// Protegidas por autenticación y rol admin
router.post('/create',  authControlMiddleware, isAdmin, etapaMiddleware, etapaController.create);
router.put('/:id',  authControlMiddleware, isAdmin, etapaMiddleware, etapaController.update);
router.delete('/:id',  authControlMiddleware, isAdmin, etapaController.remove);
router.get('/findallbyeventoid', etapaController.findAllByEventoId);// para el select
router.put('/:id/toggle-visibility', authControlMiddleware, etapaController.toggleVisibility);
router.post('/:id/toggle-ticket-type-visibility', authControlMiddleware, etapaController.toggleTicketTypeVisibility); // New route

// Públicas
router.get('/findall', etapaController.findAll);
router.get('/:id', etapaController.findOne);

module.exports = router;