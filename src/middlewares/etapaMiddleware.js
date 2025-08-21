const etapaSchema = require('../validators/etapaValidator');

const validateEtapa = (req, res, next) => {
  const { error } = etapaSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      error: 'Validación fallida',
      details: errors
    });
  }

  next();
};

module.exports = validateEtapa;