const { Evento, Etapa, Paquete, Ticket, UserEvento } = require('../database/models'); // Added UserEvento
const { Op } = require('sequelize');

exports.create = async (req, res) => {
  try {
    const { slug, ...eventoData } = req.body;
    const evento = await Evento.create(eventoData);
    res.status(201).json(evento);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener todos los eventos
exports.findAll = async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      where: { visible: true },
      attributes: ['id', 'nombre'], // Solo lo necesario para el <select>
      order: [['nombre', 'ASC']]
    });

    res.json({ success: true, data: eventos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PARA LA PAGINA PRINCIPAL CON LAS CARATULAS DEL EVENTO
exports.getAllEventos = async (req, res) => {
  try {
    const now = new Date();
    const eventos = await Evento.findAll({
      where: {
        visible: true
      },
      attributes: ['nombre', 'imagen', 'slug', 'estado', 'rango_precios', 'fecha_inicio', 'ubicacion', 'mostrar_ubicacion', 'fecha_ubicacion'],
      order: [['fecha_inicio', 'ASC']]
    });

    const processedEventos = eventos.map(evento => {
      const eventoData = evento.toJSON();

      // Logic for 'ubicacion'
      if (eventoData.fecha_ubicacion && new Date(eventoData.fecha_ubicacion) > now) {
        // If fecha_ubicacion is in the future, remove ubicacion
        delete eventoData.ubicacion;
      }
      // If fecha_ubicacion is in the past or not set, 'ubicacion' is kept

      // Logic for 'fecha_ubicacion' and 'fecha_ubicacion_text' based on 'mostrar_ubicacion'
      if (eventoData.mostrar_ubicacion === true) { // If mostrar_ubicacion is true, remove fecha_ubicacion and fecha_ubicacion_text
        delete eventoData.fecha_ubicacion;
      }
      // If mostrar_ubicacion is false, fecha_ubicacion and fecha_ubicacion_text are kept

      return eventoData;
    });

    // --- Lógica para ordenar los eventos por estado ---
    const eventosPublicados = processedEventos.filter(evento => evento.estado === 'publicado');
    const eventosFinalizados = processedEventos.filter(evento => evento.estado === 'finalizado');
    const otrosEventos = processedEventos.filter(evento => evento.estado !== 'publicado' && evento.estado !== 'finalizado');

    // Combina los arrays en el orden deseado: publicados, otros, finalizados
    const orderedEventos = [...eventosPublicados, ...otrosEventos, ...eventosFinalizados];

    res.json({
      success: true,
      data: orderedEventos
    });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los eventos',
      error: error.message
    });
  }
};

// Obtener un evento por ID
exports.findOne = async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id, {
      include: ['etapas', 'paquetes'] // Opcional: incluir relaciones. Removed 'tickets' as it's not a direct association on Evento model.
    });
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json(evento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un evento
exports.update = async (req, res) => {
  try {
    const [updated] = await Evento.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedEvento = await Evento.findByPk(req.params.id);
      res.json(updatedEvento);
    } else {
      res.status(404).json({ error: 'Evento no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar un evento (borrado lógico)
exports.delete = async (req, res) => {
  try {
    const deleted = await Evento.update(
      { visible: false },
      { where: { id: req.params.id } }
    );
    if (deleted) {
      res.json({ message: 'Evento marcado como no visible' });
    } else {
      res.status(404).json({ error: 'Evento no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener eventos por categoría
exports.findByCategory = async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      where: {
        categoria: req.params.categoria,
        visible: true
      }
    });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener eventos próximos
exports.upcomingEvents = async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      where: {
        fecha_inicio: { [Op.gte]: new Date() },
        visible: true
      },
      order: [['fecha_inicio', 'ASC']],
      limit: 10
    });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DETALLES DEL EVENTO PARA LA PAGINA DE CADA EVENTO
exports.findBySlug = async (req, res) => {
  try {
    const now = new Date();

    const evento = await Evento.findOne({
      where: { slug: req.params.slug, visible: true },
      include: [
        {
          model: Etapa,
          as: 'etapas',
          where: {
            inicio: { [Op.lte]: now },
            fin: { [Op.gte]: now },
            visible: true
          },
          required: false
        },
        {
          model: Paquete,
          as: 'paquetes',
          where: { visible: true },
          required: false
        }
      ]
    });

    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    const eventoData = evento.toJSON();

    if (eventoData.mostrar_ubicacion === false) {
      // Caso principal: mostrar_ubicacion es falso, la visibilidad depende de otras condiciones

      if (eventoData.mostrar_ubicacion_sincomprar === true) {
      // Sub-caso 1: mostrar_ubicacion_sincomprar es true
      if (eventoData.fecha_ubicacion < now) {
        // Segundo caso: mostrar_ubicacion = false, mostrar_ubicacion_sincomprar = true, fecha_ubicacion > now
        // Enviar ubicacion y ubicacion_maps tal cual (no se hace nada, se mantienen los valores originales)
        eventoData.ubicacion = eventoData.ubicacion;
        eventoData.ubicacion_maps = eventoData.ubicacion_maps;
        console.log('DEBUG caso 2: ubicacion y ubicacion_maps presentes', {
        ubicacion: eventoData.ubicacion,
        ubicacion_maps: eventoData.ubicacion_maps
        });
      } else {
        // Primer caso: mostrar_ubicacion = false, mostrar_ubicacion_sincomprar = true, fecha_ubicacion <= now
        // Eliminar ubicacion y ubicacion_maps
        delete eventoData.ubicacion;
        delete eventoData.ubicacion_maps;
      }
      } else {
      // Sub-caso 2: mostrar_ubicacion_sincomprar es false
      if (eventoData.fecha_ubicacion < now) {
        // Cuarto caso: mostrar_ubicacion = false, mostrar_ubicacion_sincomprar = false, fecha_ubicacion > now
        // Modificar ubicacion y eliminar ubicacion_maps
        eventoData.ubicacion = "Ubicación revelada solo para quienes compran tickets del evento";
        delete eventoData.ubicacion_maps;
      } else {
        // Tercer caso: mostrar_ubicacion = false, mostrar_ubicacion_sincomprar = false, fecha_ubicacion <= now
        // Eliminar ubicacion y ubicacion_maps
        delete eventoData.ubicacion;
        delete eventoData.ubicacion_maps;
      }
      }
    } else {
      // Si mostrar_ubicacion es true, se dejan los campos ubicacion y ubicacion_maps tal como están
      // y se eliminan fecha_ubicacion y fecha_ubicacion_text de la respuesta si existen
      delete eventoData.fecha_ubicacion;
      delete eventoData.fecha_ubicacion_text;
    }

    // Limpieza de etapas (no relacionada con el problema de ubicación, pero se mantiene)
    if (eventoData.etapas && eventoData.etapas.length > 0) {
      eventoData.etapas = eventoData.etapas.map(etapa => {
        const newEtapa = { ...etapa };

        if (newEtapa.visibles_por_tipo) {
          const updatedPreciosPorTipo = {};
          const updatedDisponiblesPorTipo = {};

          for (const tipo in newEtapa.visibles_por_tipo) {
            if (newEtapa.visibles_por_tipo[tipo] === 'visible') {
              if (newEtapa.precios_por_tipo && newEtapa.precios_por_tipo[tipo] !== undefined) {
                updatedPreciosPorTipo[tipo] = newEtapa.precios_por_tipo[tipo];
              }
              if (newEtapa.disponibles_por_tipo && newEtapa.disponibles_por_tipo[tipo] !== undefined) {
                updatedDisponiblesPorTipo[tipo] = newEtapa.disponibles_por_tipo[tipo];
              }
            }
          }
          newEtapa.precios_por_tipo = updatedPreciosPorTipo;
          newEtapa.disponibles_por_tipo = updatedDisponiblesPorTipo;
        }
        return newEtapa;
      });
    }

    res.json({ success: true, data: eventoData });
  } catch (error) {
    console.error('Error al buscar evento por slug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// obtener paquetes por evento
exports.findPaquetesByEvento = async (req, res) => {
  try {
    const { eventoId } = req.params;

    if (!eventoId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento'
      });
    }

    const paquetes = await Paquete.findAll({
      where: {
        eventoId: eventoId,
        disponible: true
      },
      include: [
        {
          model: Etapa,
          as: 'etapa'
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: paquetes
    });
  } catch (error) {
    console.error('Error al buscar paquetes por evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar paquetes',
      error: error.message
    });
  }
};

exports.getMostProximateEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get the last 10 tickets for the user, ordered by creation date
    const tickets = await Ticket.findAll({
      where: {
        userId,
        usado: false
      },
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'nombre', 'imagen', 'ubicacion', 'ubicacion_maps', 'ciudad', 'fecha_inicio', 'fecha_fin', 'fecha_ubicacion', 'mostrar_ubicacion', 'fecha_ubicacion_text']
        }
      ]
    });

    if (!tickets || tickets.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tienes tickets, por lo tanto no hay eventos próximos para mostrar.'
      });
    }

    let proximateEvent = null;

    // Filter and find the most proximate event that has not yet finished
    for (const ticket of tickets) {
      const event = ticket.evento;

      if (!event) continue;

      const fechaFin = new Date(event.fecha_fin);

      // Only consider events that have not yet finished
      if (fechaFin >= now) {
        if (!proximateEvent || new Date(event.fecha_inicio) < new Date(proximateEvent.fecha_inicio)) {
          proximateEvent = event;
        }
      }
    }

    if (!proximateEvent) {
      return res.status(200).json({
        success: true,
        message: 'No tienes eventos próximos disponibles en tus últimos tickets.'
      });
    }

    // Process the proximate event data
    const eventData = proximateEvent.toJSON();

    // Initialize responseData with always-present fields
    const responseData = {
      nombre: eventData.nombre,
      imagen: eventData.imagen,
      ciudad: eventData.ciudad,
      fecha_inicio: eventData.fecha_inicio,
    };

    // Conditional Logic for Ubicacion and Ubicacion Maps
    // If 'mostrar_ubicacion' is true, send 'ubicacion' and 'ubicacion_maps'
    if (eventData.mostrar_ubicacion === true) {
      responseData.ubicacion = eventData.ubicacion;
      responseData.ubicacion_maps = eventData.ubicacion_maps;
    }
    // If 'mostrar_ubicacion' is false, 'ubicacion' and 'ubicacion_maps' are not sent.

    // Logic for 'fecha_ubicacion_text':
    // Send if 'mostrar_ubicacion' is false AND 'fecha_ubicacion' is in the future
    if (eventData.mostrar_ubicacion === false && eventData.fecha_ubicacion && new Date(eventData.fecha_ubicacion) > now) {
      responseData.fecha_ubicacion_text = eventData.fecha_ubicacion_text;
      responseData.fecha_ubicacion = eventData.fecha_ubicacion;
    }

    if (eventData.fecha_ubicacion && new Date(eventData.fecha_ubicacion) < now) {
      responseData.ubicacion = eventData.ubicacion;
      responseData.ubicacion_maps = eventData.ubicacion_maps;
    }


    res.json({
      success: true,
      message: 'Evento más próximo encontrado.',
      data: responseData
    });

  } catch (error) {
    console.error('Error al obtener el evento más próximo del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener el evento más próximo.',
      error: error.message
    });
  }
};

exports.getEventsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEvents = await UserEvento.findAll({
      where: { userId },
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'imagen', 'nombre'],
          where: { visible: true }
        }
      ]
    });

    const events = userEvents.map(ue => ue.evento).filter(event => event !== null);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error al obtener eventos por usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getEventDetailsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Get event ID from parameters

    const userEvent = await UserEvento.findOne({
      where: { userId, eventoId: id },
      include: [
        {
          model: Evento,
          as: 'evento',
          where: { visible: true },
          include: [
            {
              model: Etapa,
              as: 'etapas',
            },
            {
              model: Paquete,
              as: 'paquetes',
            }
          ]
        }
      ]
    });

    if (!userEvent || !userEvent.evento) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado o no asociado al usuario.' });
    }

    res.json({ success: true, data: userEvent.evento });
  } catch (error) {
    console.error('Error al obtener detalles del evento por usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};