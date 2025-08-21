const Joi = require('joi');

const eventoSchema = Joi.object({
  nombre: Joi.string().min(3).max(255).required(),
  trigrama: Joi.string().min(3).max(3).required(),
  subtitulo: Joi.string().max(255).allow(null, ''),
  descripcion: Joi.array()
    .items(Joi.string().min(1).required())
    .min(1)
    .required()
    .messages({
      'array.base': 'La descripción debe ser un array',
      'array.min': 'La descripción debe tener al menos un elemento',
      'string.empty': 'Los elementos de descripción no pueden estar vacíos',
      'any.required': 'La descripción es requerida'
    }),
  imagen: Joi.string().uri().allow(null, ''),
  imagen_c: Joi.string().uri().allow(null, ''),
  imagen_post: Joi.string().uri().allow(null, ''),
  rango_precios: Joi.string().max(50).allow(null, ''),
  es_gratis: Joi.boolean().default(false),

  // CONDITIONAL LOGIC FOR UBICACION AND UBICACION_MAPS
  ubicacion: Joi.when('mostrar_ubicacion', {
    is: true,
    then: Joi.string().min(5).max(500).required(),
    otherwise: Joi.when('mostrar_ubicacion_sincomprar', {
      is: true,
      then: Joi.string().min(5).max(500).required(), // Still required if mostrar_ubicacion_sincomprar is true
      otherwise: Joi.string().min(5).max(500).allow(null, '') // Allow null if not showing and not showing without purchase
    })
  }),
  ubicacion_maps: Joi.when('mostrar_ubicacion', {
    is: true,
    then: Joi.string().min(5).max(500).required(),
    otherwise: Joi.when('mostrar_ubicacion_sincomprar', {
      is: true,
      then: Joi.string().min(5).max(500).required(), // Still required if mostrar_ubicacion_sincomprar is true
      otherwise: Joi.string().min(5).max(500).allow(null, '') // Allow null if not showing and not showing without purchase
    })
  }),

  mostrar_ubicacion: Joi.boolean().default(false),
  mostrar_ubicacion_sincomprar: Joi.boolean().default(false),
  fecha_ubicacion: Joi.when('mostrar_ubicacion', {
    is: false,
    then: Joi.date().required(),
    otherwise: Joi.date().allow(null)
  }),
  fecha_ubicacion_text: Joi.when('mostrar_ubicacion', {
    is: false,
    then: Joi.string().required(),
    otherwise: Joi.string().allow(null)
  }),
  ciudad: Joi.string().required(),
  fecha_inicio: Joi.date().greater('now').required(),
  fecha_fin: Joi.date().min(Joi.ref('fecha_inicio')).required(),
  limite_tickets: Joi.number().integer().min(0).allow(null),
  categoria: Joi.string().valid(
    'techno',
    'festival',
    'underground',
    'rave',
    'gratis',
    'club',
    'concierto',
    'afterparty'
  ).allow(null),
  organizador: Joi.string().required(),
  info_contacto: Joi.string().required(),
  visible: Joi.boolean().default(true),
  estado: Joi.string().valid('borrador', 'publicado', 'cancelado', 'finalizado').default('borrador'),
  edad_minima: Joi.number().integer().min(0).max(120).allow(null),
  destacado: Joi.boolean().default(false),
});

module.exports = eventoSchema;