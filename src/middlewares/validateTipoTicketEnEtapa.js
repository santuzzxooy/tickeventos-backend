const { Etapa } = require('../database/models');

const validateTipoTicketEnEtapa = async (req, res, next) => {
  const { etapaId, tipoTicket } = req.body;

  if (!etapaId || !tipoTicket) {
    return res.status(400).json({ error: 'etapaId y tipoTicket son requeridos' });
  }

  try {
    const etapa = await Etapa.findByPk(etapaId);

    if (!etapa) {
      return res.status(404).json({ error: 'Etapa no encontrada' });
    }

    const tiposDisponibles = Object.keys(etapa.precios_por_tipo || {});

    if (!tiposDisponibles.includes(tipoTicket)) {
      return res.status(400).json({
        error: `El tipo de ticket '${tipoTicket}' no está definido en la etapa. Tipos válidos: ${tiposDisponibles.join(', ')}`
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error al validar tipo de ticket en etapa' });
  }
};

module.exports = validateTipoTicketEnEtapa;