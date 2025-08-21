const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/eventoController');
const validateEvento = require('../middlewares/eventoMiddleware');
const { authControlMiddleware, authMiddleware } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

router.post('/create', authControlMiddleware, isAdmin, validateEvento, eventoController.create);
router.get('/proximate-event', authMiddleware, eventoController.getMostProximateEvent);

router.get('/my-events', authControlMiddleware, eventoController.getEventsByUser);
router.get('/my-events/:id', authControlMiddleware, eventoController.getEventDetailsByUser);

router.put('/:id', authControlMiddleware, isAdmin, validateEvento, eventoController.update);
router.get('/findall', authControlMiddleware, isAdmin, eventoController.findAll);// para el select
router.get('/getall', eventoController.getAllEventos); // publica para obtener los datos en la pagina principal
router.get('/slug/:slug', eventoController.findBySlug); // detalle del evento
router.get('/:id', authControlMiddleware, isAdmin, eventoController.findOne);
router.delete('/:id', authControlMiddleware, isAdmin, eventoController.delete);

module.exports = router;