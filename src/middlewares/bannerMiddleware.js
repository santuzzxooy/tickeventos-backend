const { createBannerSchema, updateBannerSchema } = require('../validators/bannerValidator');
const { Banner } = require('../database/models');

const validateBanner = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.validateAsync(req.body, { abortEarly: false });
      next();
    } catch (error) {
      const errors = error.details.map(detail => ({
        field: detail.context.key,
        message: detail.message
      }));
      res.status(400).json({ success: false, errors });
    }
  };
};

const checkBannerExists = async (req, res, next) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, error: 'Banner no encontrado' });
    }
    req.banner = banner;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al verificar el banner' });
  }
};

module.exports = {
  validateCreateBanner: validateBanner(createBannerSchema),
  validateUpdateBanner: validateBanner(updateBannerSchema),
  checkBannerExists
};