const { UserEvento, User, Evento } = require('../database/models');
const { Op } = require('sequelize');

const getUserEvents = async (req, res) => {
  try {
    const { userId, eventoId, page = 1, pageSize = 10, search = '' } = req.query;
    const offset = (page - 1) * pageSize;

    let whereClause = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (eventoId) {
      whereClause.eventoId = eventoId;
    }

    // Add search functionality for username or event name
    if (search) {
      // Find users or events that match the search term
      const users = await User.findAll({
        where: {
          username: {
            [Op.like]: `%${search}%`
          }
        },
        attributes: ['id']
      });

      const eventos = await Evento.findAll({
        where: {
          nombre: { // CAMBIO: Usar 'nombre' en lugar de 'name'
            [Op.like]: `%${search}%`
          }
        },
        attributes: ['id']
      });

      const userIds = users.map(user => user.id);
      const eventoIds = eventos.map(evento => evento.id);

      if (userIds.length > 0 || eventoIds.length > 0) {
        whereClause[Op.or] = [];
        if (userIds.length > 0) {
          whereClause[Op.or].push({ userId: { [Op.in]: userIds } });
        }
        if (eventoIds.length > 0) {
          whereClause[Op.or].push({ eventoId: { [Op.in]: eventoIds } });
        }
      } else {
        // If no users or events match the search, return an empty result
        return res.status(200).json({
          success: true,
          totalItems: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          userEvents: []
        });
      }
    }


    const { count, rows: userEvents } = await UserEvento.findAndCountAll({
      where: whereClause,
      limit: parseInt(pageSize),
      offset: offset,
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'nombre', 'imagen']
        }
      ]
    });

    const totalPages = Math.ceil(count / pageSize);

    return res.status(200).json({
      success: true,
      totalItems: count,
      totalPages: totalPages,
      currentPage: parseInt(page),
      userEvents,
    });
  } catch (error) {
    // CAMBIO IMPORTANTE: Registra el error completo para depuración
    console.error('Error getting user events:', error.message, error.stack);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener las relaciones usuario-evento.' });
  }
};

const getUserEventById = async (req, res) => {
  try {
    const { userId, eventoId } = req.params;

    const userEvento = await UserEvento.findOne({
      where: {
        userId: userId,
        eventoId: eventoId,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'nombre'] // CAMBIO
        }
      ]
    });

    if (!userEvento) {
      return res.status(404).json({ success: false, error: 'Relación usuario-evento no encontrada.' });
    }

    return res.status(200).json({ success: true, userEvento });
  } catch (error) {
    console.error('Error getting user event by ID:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener la relación usuario-evento.' });
  }
};


const createUserEvent = async (req, res) => {
  try {
    const { userId, eventoId } = req.body;

    const userExists = await User.findByPk(userId);
    const eventExists = await Evento.findByPk(eventoId);

    if (!userExists) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }
    if (!eventExists) {
      return res.status(404).json({ success: false, error: 'Evento no encontrado.' });
    }

    const [userEvento, created] = await UserEvento.findOrCreate({
      where: { userId, eventoId },
      defaults: { userId, eventoId }
    });

    if (!created) {
      return res.status(409).json({ success: false, error: 'La relación usuario-evento ya existe.' });
    }

    return res.status(201).json({ success: true, message: 'Relación usuario-evento creada exitosamente.', userEvento });
  } catch (error) {
    console.error('Error al crear user-evento:', error.message, error.stack);
    return res.status(500).json({ success: false, error: error.message || 'Error al crear la relación usuario-evento.' });
  }
};

const deleteUserEvent = async (req, res) => {
  try {
    const { userId, eventoId } = req.params;

    const deletedRows = await UserEvento.destroy({
      where: { userId, eventoId }
    });

    if (deletedRows === 0) {
      return res.status(404).json({ success: false, error: 'Relación usuario-evento no encontrada.' });
    }

    return res.status(200).json({ success: true, message: 'Relación usuario-evento eliminada exitosamente.' });
  } catch (error) {
    console.error('Error deleting user event:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar la relación usuario-evento.' });
  }
};

const getUserEventsForUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const userEvents = await UserEvento.findAll({
      where: { userId: userId },
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'nombre', 'imagen']
        }
      ]
    });

    if (!userEvents || userEvents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tienes eventos asociados.',
        userEvents: []
      });
    }

    const formattedUserEvents = userEvents.map(userEvent => ({
      userId: userEvent.userId,
      eventoId: userEvent.eventoId,
      evento: userEvent.evento ? {
        id: userEvent.evento.id,
        nombre: userEvent.evento.nombre,
        imagen: userEvent.evento.imagen
      } : null
    }));

    return res.status(200).json({
      success: true,
      totalItems: formattedUserEvents.length,
      totalPages: 1,
      currentPage: 1,
      userEvents: formattedUserEvents
    });
  } catch (error) {
    console.error('Error al obtener eventos del usuario:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener tus eventos.' });
  }
};

module.exports = {
  getUserEvents,
  getUserEventById,
  createUserEvent,
  deleteUserEvent,
  getUserEventsForUser
};