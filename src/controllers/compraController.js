const { Compra, Ticket, Carrito, Evento, sequelize } = require('../database/models');
const { Op } = require('sequelize');

const cancelExpiredUserPurchases = async (userId) => {
  const transaction = await sequelize.transaction();
  try {
    const now = new Date();
    await Compra.update(
      { estado: 'cancelado' },
      {
        where: {
          userId: userId,
          estado: 'pendiente',
          fecha_limite: { [Op.lt]: now }
        },
        transaction
      }
    );
    await transaction.commit();
  } catch (error) {
    console.error('Error cancelling expired purchases:', error);
    await transaction.rollback();
  }
};

const obtenerComprasUsuario = async (req, res) => {
  try {
    await cancelExpiredUserPurchases(req.user.id);

    const { page = 1, limit = 7 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: compras } = await Compra.findAndCountAll({
      where: {
        userId: req.user.id,
        estado: { [Op.not]: 'cancelado' }
      },
      include: [
        {
          model: Ticket,
          as: 'tickets',
          attributes: ['id', 'eventoId', 'qrCode', 'usado'],
          include: [
            {
              model: Evento,
              as: 'evento',
              attributes: ['id', 'nombre', 'imagen_c']
            }
          ]
        }
      ],
      order: [['fecha_compra', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    res.json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      compras
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener las compras',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const obtenerDetalleCompra = async (req, res) => {
  try {
    const { id } = req.params;

    const compra = await Compra.findOne({
      where: {
        id,
        userId: req.user.id
      },
      include: [
        {
          model: Carrito,
          as: 'carrito',
          attributes: ['id', 'total_tickets', 'subtotal', 'total']
        },
        {
          model: Ticket,
          as: 'tickets',
          include: [
            {
              model: Evento,
              as: 'evento',
              attributes: ['id', 'nombre', 'fecha_inicio', 'ubicacion', 'imagen']
            }
          ]
        }
      ]
    });

    if (!compra) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    res.json(compra);
  } catch (error) {
    console.error('[ERROR DETALLE COMPRA]', error);
    res.status(500).json({
      error: 'Error al obtener el detalle de la compra',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const obtenerEstadoCompra = async (req, res) => {
  try {
    const { id } = req.params;

    const compra = await Compra.findOne({
      where: {
        id,
        userId: req.user.id
      },
      attributes: ['id', 'estado', 'fecha_compra', 'fecha_pago', 'precio_total']
    });

    if (!compra) {
      console.log('Compra no encontrada o no pertenece al usuario');
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    res.json({
      id: compra.id,
      estado: compra.estado,
      fecha_compra: compra.fecha_compra,
      fecha_pago: compra.fecha_pago,
      precio_total: compra.precio_total
    });
  } catch (error) {
    console.error('[ERROR ESTADO COMPRA]', error);
    res.status(500).json({
      error: 'Error al obtener el estado de la compra',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  obtenerComprasUsuario,
  obtenerDetalleCompra,
  obtenerEstadoCompra
};