const Joi = require('joi');

module.exports = Joi.object({
  eventoId: Joi.number().integer().required(),
  etapaId: Joi.number().integer().required(),
  nombre: Joi.string().min(3).max(255).required(),
  descripcion: Joi.string().allow('', null),
  cantidadTickets: Joi.number().integer().min(1).required(),
  tipoTicket: Joi.string().min(1).required(),
  descuento: Joi.number().min(0).max(1).required(),
  disponible: Joi.boolean().default(true),
  carritoId: Joi.number().integer().optional().allow(null),
  compraId: Joi.number().integer().optional().allow(null)
});
