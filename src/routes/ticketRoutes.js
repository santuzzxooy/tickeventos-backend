const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const ticketTransferidoController = require('../controllers/ticketTransferidoController');
const { authMiddleware, authControlMiddleware } = require('../middlewares/authMiddleware');
const { validateSpecialTicketCreation } = require('../validators/ticketValidator');

// Obtener tickets del usuario autenticado
router.get('/mis-tickets', authMiddleware, ticketController.getTicketsByUser);

// Obtener tickets no usados y no transferidos del usuario autenticado
router.get('/mis-unused-tickets', authMiddleware, ticketController.getUnusedTicketsByUser);

// Obtener tickets transferidos del usuario autenticado
router.get('/mis-transfered-tickets', authMiddleware, ticketController.getTransferedTicketsByUser);

// Crear ticket especial (cortesía/backstage)**
router.post('/crear-especial', authControlMiddleware, validateSpecialTicketCreation, ticketController.createSpecialTicket);

// Obtener tickets especiales por evento del usuario
router.get('/especiales-por-evento', authControlMiddleware, ticketController.getSpecialTicketsByUserEvent);

// Transferir tickets
router.post('/:ticketId/transfer', authMiddleware, ticketTransferidoController.transferTicket);

// Validar un ticket por su QR (marcar como usado)
router.post('/validar/:qrCode', authControlMiddleware, ticketController.validarTicket);

// Buscar un ticket por su QR (solo información, sin validar)
router.get('/buscar/:qrCode', authControlMiddleware, ticketController.findTicketByQR);

module.exports = router;