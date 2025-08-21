const Joi = require('joi');
const { Banner } = require('../database/models');

// Esquema base reutilizable
const baseSchema = {
  nombre: Joi.string().min(3).max(100).required().messages({
    'string.empty': 'El nombre es obligatorio',
    'string.min': 'El nombre debe tener al menos 3 caracteres',
    'string.max': 'El nombre no puede exceder los 100 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  imagen: Joi.string().uri().required().messages({
    'string.uri': 'La imagen principal debe ser una URL válida',
    'any.required': 'La imagen principal es requerida'
  }),
  imagen_movil: Joi.string().uri().allow('').optional().messages({
    'string.uri': 'La imagen móvil debe ser una URL válida'
  }),
  url: Joi.string().uri().allow('').optional().messages({
    'string.uri': 'La URL de redirección debe ser válida'
  }),
  orden: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'El orden debe ser un número entero',
    'number.min': 'El orden no puede ser negativo'
  }),
  fecha_inicio: Joi.date().iso().when('estado', {
    is: 'publicado',
    then: Joi.date().iso().required().messages({
      'date.base': 'Fecha de inicio debe ser ISO8601 (ej: 2023-10-05T14:30:00-05:00)',
      'date.iso': 'Formato inválido. Use ISO8601 con zona horaria'
    })
  }),
  fecha_fin: Joi.date().iso().min(Joi.ref('fecha_inicio')).messages({
    'date.min': 'La fecha fin debe ser posterior a la fecha inicio'
  }),
  visible: Joi.boolean().default(true),
  estado: Joi.string().valid('borrador', 'publicado', 'oculto', 'finalizado').default('borrador')
};

// Esquemas específicos
const createBannerSchema = Joi.object({
  ...baseSchema,
  fecha_inicio: baseSchema.fecha_inicio.messages({
    'date.base': 'Fecha de inicio inválida',
    'any.required': 'La fecha de inicio es obligatoria para banners publicados'
  }),
  fecha_fin: baseSchema.fecha_fin.messages({
    'date.base': 'Fecha de fin inválida',
    'any.required': 'La fecha de fin es obligatoria para banners publicados',
    'date.min': 'La fecha fin debe ser posterior a la fecha inicio'
  })
});

const updateBannerSchema = Joi.object({
  ...baseSchema,
  nombre: Joi.string().min(3).max(100).optional(),
  imagen: Joi.string().uri().optional()
}).min(1); // Al menos un campo para actualizar

module.exports = {
  createBannerSchema,
  updateBannerSchema
};