const Joi = require('joi');

// Esquema de validación para crear un ticket especial
const createSpecialTicketSchema = Joi.object({
  eventoId: Joi.number().integer().positive().required()
    .messages({
      'any.required': 'El ID del evento es obligatorio.',
      'number.base': 'El ID del evento debe ser un número.',
      'number.integer': 'El ID del evento debe ser un número entero.',
      'number.positive': 'El ID del evento debe ser un número positivo.'
    }),
  tipo: Joi.string().trim().min(3).max(50).required()
    .messages({
      'any.required': 'El tipo de ticket es obligatorio (ej. "cortesia", "backstage").',
      'string.empty': 'El tipo de ticket no puede estar vacío.',
      'string.min': 'El tipo de ticket debe tener al menos {#limit} caracteres.',
      'string.max': 'El tipo de ticket no puede exceder los {#limit} caracteres.'
    }),
  userId: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.base': 'El ID de usuario debe ser un número.',
      'number.integer': 'El ID de usuario debe ser un número entero.',
      'number.positive': 'El ID de usuario debe ser un número positivo.'
    })
});

// Middleware de validación
const validateSpecialTicketCreation = (req, res, next) => {
  const { error } = createSpecialTicketSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ errors });
  }
  next();
};

module.exports = {
  validateSpecialTicketCreation
};