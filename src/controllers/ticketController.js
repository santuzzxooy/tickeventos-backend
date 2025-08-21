const { Ticket, Etapa, Evento, Paquete, UserEvento } = require('../database/models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Función para generar código único tipo QR
function generarCodigoUnico(longitud = 28) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_~.=';
  let codigo = '';
  const bytes = crypto.randomBytes(longitud);

  for (let i = 0; i < longitud; i++) {
    const index = bytes[i] % caracteres.length;
    codigo += caracteres.charAt(index);
  }

  return codigo;
}

// Crear ticket automáticamente al momento de la compra
exports.createTicket = async (data, transaction = null) => {
  const { userId, etapaId, tipo, compraId, carritoId, paqueteId, palcoId } = data;

  const ticketData = {
    userId,
    compraId,
    carritoId,
    tipo,
    paqueteId: paqueteId || null,
    palcoId: palcoId || null,
  };

  // Obtener la etapa y evento
  let etapa = null;
  if (etapaId) {
    etapa = await Etapa.findByPk(etapaId, {
      include: [{ model: Evento, as: 'evento', attributes: ['trigrama', 'id'] }],
      transaction
    });
    if (!etapa) throw new Error('Etapa no encontrada');
    if (!etapa.evento) throw new Error('Evento no encontrado para esta etapa');

    ticketData.etapaId = etapa.id;
    ticketData.eventoId = etapa.evento.id;
  } else if (palcoId) {
    const palco = await Palco.findByPk(palcoId, {
      include: [{ model: Evento, as: 'evento', attributes: ['trigrama', 'id'] }],
      transaction
    });
    if (!palco) throw new Error('Palco no encontrado');
    if (!palco.evento) throw new Error('Evento no encontrado para este palco');

    ticketData.etapaId = palco.etapaId;
    ticketData.eventoId = palco.evento.id;
  } else {
    throw new Error('Falta el ID de etapa o palco para generar el ticket');
  }

  // Generar código QR
  const trigrama = etapa?.evento?.trigrama || 'XXX';
  const codigoUnico = generarCodigoUnico();
  const qrData = `${trigrama}-${ticketData.etapaId || '0'}-${ticketData.paqueteId || '0'}-${ticketData.palcoId || '0'}-${codigoUnico}`;
  ticketData.qrCode = qrData;

  // Crear ticket en la base de datos
  const newTicket = await Ticket.create(ticketData, { transaction });
  console.log(`Ticket creado con QR: ${qrData}`);
  return newTicket;
};


// Crear ticket especial (cortesía/backstage)
exports.createSpecialTicket = async (req, res) => {
  try {
    const { eventoId, tipo } = req.body;
    const userIdFromAuth = req.user && req.user.id ? req.user.id : null;
    const finalUserId = userIdFromAuth;

    const evento = await Evento.findByPk(eventoId, {
      attributes: ['trigrama']
    });

    if (!evento) {
      console.warn(`Intento de crear ticket especial para evento no encontrado: ${eventoId}`);
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    if (!evento.trigrama || evento.trigrama.length !== 3) {
      console.warn(`Trigrama del evento no válido para eventoId: ${eventoId}, trigrama: ${evento.trigrama}`);
      return res.status(400).json({ error: 'Trigrama del evento no válido' });
    }

    const trigrama = evento.trigrama.toUpperCase();
    const qrCode = `${trigrama}-${generarCodigoUnico()}`;

    const ticketData = {
      eventoId,
      etapaId: null, // Explícitamente null para tickets especiales
      userId: finalUserId,
      compraId: null,
      carritoId: null,
      paqueteId: null, // <--- Explicitly set to null for special tickets
      tipo,
      usado: false,
      qrCode
    };

    const ticket = await Ticket.create(ticketData);

    res.status(201).json({
      message: 'Ticket especial creado exitosamente',
      ticket: {
        id: ticket.id,
        qrCode: ticket.qrCode,
        tipo: ticket.tipo,
        eventoId: ticket.eventoId,
        userId: ticket.userId,
        createdAt: ticket.createdAt
      }
    });

  } catch (error) {
    console.error('Error al crear ticket especial:', error);
    res.status(500).json({
      error: 'Error interno del servidor al crear ticket especial',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};


// Obtener tickets del usuario autenticado
exports.getTicketsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 7; // Default to 7 tickets per page
    const offset = (page - 1) * limit;

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: { 
        userId,
        transferido: false
      },
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['nombre', 'imagen', 'imagen_c', 'trigrama']
        },
        {
          model: Etapa,
          as: 'etapa',
          attributes: ['nombre']
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      totalTickets: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      tickets
    });
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({
      error: 'Error al obtener los tickets',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener los tickets de un usuario filtrando los tickets usados y los transferidos
exports.getUnusedTicketsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const offset = (page - 1) * limit;

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: { 
        userId,
        usado: false, // Filter for unused tickets
        transferido: false
      },
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['nombre', 'imagen_c', 'imagen', 'trigrama']
        },
        {
          model: Etapa,
          as: 'etapa',
          attributes: ['nombre']
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      totalTickets: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      tickets
    });
  } catch (error) {
    console.error('Error al obtener tickets no usados:', error);
    res.status(500).json({
      error: 'Error al obtener los tickets no usados',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtener los tickets de un usuario filtrando los tickets no transferidos
exports.getTransferedTicketsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const offset = (page - 1) * limit;

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: { 
        userId,
        transferido: true
      },
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['nombre', 'imagen', 'imagen_c', 'trigrama']
        },
        {
          model: Etapa,
          as: 'etapa',
          attributes: ['nombre']
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      totalTickets: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      tickets
    });
  } catch (error) {
    console.error('Error al obtener tickets no usados:', error);
    res.status(500).json({
      error: 'Error al obtener los tickets no usados',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

exports.findTicketByQR = async (req, res) => {
  try {
    const { qrCode } = req.params;

    const ticket = await Ticket.findOne({
      where: { qrCode },
      include: [
        { model: Evento, as: 'evento' },
        { model: Etapa, as: 'etapa' },
        { model: Paquete, as: 'paquete' } // <--- INCLUDE PAQUETE
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({
      ticket: {
        id: ticket.id,
        qrCode: ticket.qrCode,
        tipo: ticket.tipo,
        usado: ticket.usado,
        evento: ticket.evento,
        etapa: ticket.etapa,
        paquete: ticket.paquete,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al buscar ticket:', error);
    res.status(500).json({ error: 'Error al buscar el ticket' });
  }
};

// Función para validar un ticket por su QR
exports.validarTicket = async (req, res) => {
  try {
    const { qrCode } = req.params;

    const ticket = await Ticket.findOne({
      where: { qrCode },
      include: ['evento', 'etapa', 'paquete']
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (ticket.usado) {
      return res.status(400).json({
        error: 'Ticket ya utilizado',
        usado: true,
        fechaUso: ticket.updatedAt
      });
    }

    // Marcar como usado
    await ticket.update({ usado: true });

    res.json({
      valido: true,
      ticket: {
        id: ticket.id,
        evento: ticket.evento.nombre,
        tipo: ticket.tipo,
        paquete: ticket.paquete ? ticket.paquete.nombre : null, // <--- RETURN PAQUETE NAME
        fechaValidacion: new Date()
      }
    });
  } catch (error) {
    console.error('Error al validar ticket:', error);
    res.status(500).json({ error: 'Error al validar el ticket' });
  }
};

// Controlador para obtener tickets especiales por evento del usuario
exports.getSpecialTicketsByUserEvent = async (req, res) => {
  try {
    const userId = req.user.id;

    const userEvents = await UserEvento.findAll({
      where: { userId },
      attributes: ['eventoId']
    });

    const eventIds = userEvents.map(ue => ue.eventoId);

    if (eventIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tienes eventos asociados, por lo tanto no hay tickets especiales para mostrar.',
        tickets: []
      });
    }

    const specialTickets = await Ticket.findAll({
      where: {
        etapaId: {
          [Op.is]: null
        },
        eventoId: {
          [Op.in]: eventIds
        }
      },
      include: [
        { model: Evento, as: 'evento', attributes: ['id', 'nombre', 'imagen', 'trigrama'] },
        { model: Paquete, as: 'paquete' } // <--- INCLUDE PAQUETE
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      totalItems: specialTickets.length,
      tickets: specialTickets
    });

  } catch (error) {
    console.error('Error al obtener tickets especiales por evento del usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor al obtener tickets especiales.',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};