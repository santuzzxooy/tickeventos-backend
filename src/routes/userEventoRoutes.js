const express = require('express');
const router = express.Router();
const userEventoController = require('../controllers/userEventoController'); // Adjust path as needed
const { authControlMiddleware, adminMiddleware, controlMiddleware } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

// GET all user-event relationships (with optional pagination and search)
// Accessible by 'admin' and 'entry_control' roles
router.get('/', authControlMiddleware, isAdmin, userEventoController.getUserEvents);

// GET events for the authenticated user
router.get('/my-events', authControlMiddleware, userEventoController.getUserEventsForUser);

// POST a new user-event relationship
// Only accessible by 'admin' role
router.post('/', authControlMiddleware, isAdmin, userEventoController.createUserEvent);

// GET a specific user-event relationship by userId and eventoId
// Accessible by 'admin' and 'entry_control' roles
router.get('/:userId/:eventoId', controlMiddleware, userEventoController.getUserEventById);

// DELETE a user-event relationship by userId and eventoId
// Only accessible by 'admin' role
router.delete('/:userId/:eventoId', adminMiddleware, userEventoController.deleteUserEvent);

module.exports = router;