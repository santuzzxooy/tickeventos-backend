const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  loginControlUser,
  checkUsernameAvailability,
  forgotPassword,
  changePassword
} = require('../controllers/authController');

const { sendContactEmail } = require('../controllers/contactoController');

const userController = require('../controllers/userController');

const { authMiddleware, authControlMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Rutas públicas
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/check-username', checkUsernameAvailability);
router.post('/forgot-password', forgotPassword);

router.post('/contact', sendContactEmail);

router.post('/demote-to-user', authControlMiddleware, adminMiddleware, userController.demoteEntryControlToUser);
router.get('/entrycontrolusers', authControlMiddleware, adminMiddleware, userController.getEntryControlUsers);

// Rutas protegidas
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

router.get('/controlme', authControlMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Ruta para el panel de control
router.post('/logincontroluser', loginControlUser);

router.put('/change-password', authMiddleware, changePassword);

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });
  return res.json({ success: true, message: 'Sesión cerrada' });
});

router.put('/update', authMiddleware, userController.updateUser);
router.delete('/:id', authMiddleware, adminMiddleware, userController.deleteUser);


module.exports = router;