const eventoSchema = require('../validators/eventoValidator');

function validateEvento(req, res, next) {
  const { error } = eventoSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map((e) => e.message);
    return res.status(400).json({ error: 'Validación fallida', detalles: errores });
  }

  next();
}

module.exports = validateEvento;
