const { Palco, Etapa } = require('../database/models');
const { Op } = require('sequelize');

exports.create = async (req, res) => {
  try {
    const { eventoId, etapaId, nombre, ubicacion, cantidadTickets, precio } = req.body;

    const existingPalco = await Palco.findOne({
      where: {
        eventoId: eventoId,
        ubicacion: ubicacion
      }
    });

    if (existingPalco) {
      return res.status(409).json({ error: 'Ya existe un palco con esa ubicación para este evento.' });
    }

    const palco = await Palco.create({
      eventoId,
      etapaId,
      nombre,
      ubicacion,
      cantidadTickets,
      precio,
      disponible: true
    });

    res.status(201).json({
      success: true,
      data: palco,
      message: 'Palco creado exitosamente.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getPalcosDisponibles = async (req, res) => {
  try {
    const { eventoId } = req.params;

    const palcos = await Palco.findAll({
      where: {
        eventoId: eventoId,
        disponible: true
      },
      attributes: ['id', 'nombre', 'ubicacion', 'precio', 'cantidadTickets']
    });

    res.status(200).json({
      success: true,
      data: palcos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener los palcos disponibles'
    });
  }
};

exports.getPalcoById = async (req, res) => {
  try {
    const { id } = req.params;
    const palco = await Palco.findByPk(id);

    if (!palco) {
      return res.status(404).json({ success: false, error: 'Palco no encontrado' });
    }

    res.status(200).json({ success: true, data: palco });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};