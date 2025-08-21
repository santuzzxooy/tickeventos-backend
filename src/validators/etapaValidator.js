const Joi = require('joi');

const etapaSchema = Joi.object({
  eventoId: Joi.number().integer().required(),

  nombre: Joi.string().min(3).max(255).required(),

  descripcion: Joi.string().max(1000).allow(null, ''),

  inicio: Joi.date().required(),

  fin: Joi.date().greater(Joi.ref('inicio')).required(),

  orden: Joi.number().integer().min(0).allow(null),

  precios_por_tipo: Joi.object()
    .pattern(
      Joi.string().min(1),
      Joi.number().positive()
    )
    .min(1)
    .required()
    .messages({
      'object.pattern.match': 'Cada tipo debe tener un precio positivo',
      'object.min': 'Debe haber al menos un tipo de ticket con precio'
    }),
    
  disponibles_por_tipo: Joi.object()
    .pattern(
      Joi.string().min(1),
      Joi.number().integer().min(0)
    )
    .min(1)
    .required()
    .messages({
      'object.pattern.match': 'Cada tipo debe tener una disponibilidad válida (entero no negativo)',
      'object.min': 'Debe haber al menos un tipo de ticket con disponibilidad'
    }),
  visibles_por_tipo: Joi.object() //
    .pattern( //
      Joi.string().min(1), //
      Joi.string().valid('visible', 'invisible').required() //
    ) //
    .min(1) //
    .required() //
    .messages({ //
      'object.pattern.match': 'Cada tipo debe tener un estado de visibilidad válido ("visible" o "invisible")', //
      'object.min': 'Debe haber al menos un tipo de ticket con visibilidad' //
    }) //
});

module.exports = etapaSchema;