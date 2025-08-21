const express = require('express');
const router = express.Router();
const { authControlMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const bannerController = require('../controllers/bannerCotroller');
const bannerMiddleware = require('../middlewares/bannerMiddleware');

// Ruta pública
router.get('/active', bannerController.getActiveBanners);

// Rutas protegidas
router.post('/create',
  authControlMiddleware,
  adminMiddleware,
  bannerMiddleware.validateCreateBanner, // Nueva validación
  bannerController.createBanner
);

router.get('/admin/all',
  authControlMiddleware,
  adminMiddleware,
  bannerController.getAllBanners
);

router.put('/update/:id',
  authControlMiddleware,
  adminMiddleware,
  bannerMiddleware.checkBannerExists, // Verificar existencia
  bannerMiddleware.validateUpdateBanner, // Validación de actualización
  bannerController.updateBanner
);

router.delete('/delete/:id',
  authControlMiddleware,
  adminMiddleware,
  bannerMiddleware.checkBannerExists, // Verificar existencia
  bannerController.deleteBanner
);

module.exports = router;