const express = require('express');
const router = express.Router();
const cartController = require('../controllers/carritoController');
const cartValidator = require('../validators/carritoValidator');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, cartController.getCart);
router.post('/items', authMiddleware, cartValidator.validateItem, cartController.addItem);
router.put('/items/:id', authMiddleware, cartValidator.validateUpdateItem, cartController.updateItem);
router.delete('/items/:id', authMiddleware, cartValidator.validateRemoveItem, cartController.removeItem);
router.delete('/clear', authMiddleware, cartController.clearCart);

module.exports = router;