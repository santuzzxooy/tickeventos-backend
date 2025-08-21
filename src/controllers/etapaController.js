const { Etapa, Evento } = require('../database/models');
const Joi = require('joi'); // Import Joi for validation

const create = async (req, res) => {
  try {
    const { eventoId, ...data } = req.body;

    // Validar que los tipos en precios_por_tipo y disponibles_por_tipo coincidan
    const tiposPrecios = Object.keys(data.precios_por_tipo || {});
    const tiposDisponibles = Object.keys(data.disponibles_por_tipo || {});
    const tiposVisibles = Object.keys(data.visibles_por_tipo || {}); // Get keys for visibles_por_tipo

    if (tiposPrecios.length !== tiposDisponibles.length ||
        !tiposPrecios.every(tipo => tiposDisponibles.includes(tipo)) ||
        tiposPrecios.length !== tiposVisibles.length || // Check length with visibles_por_tipo
        !tiposPrecios.every(tipo => tiposVisibles.includes(tipo))) { // Check if all types match
      return res.status(400).json({
        success: false,
        error: 'Los tipos de ticket en precios, disponibilidad y visibilidad deben coincidir'
      });
    }

    const evento = await Evento.findByPk(eventoId);
    if (!evento) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    const etapa = await Etapa.create({ ...data, eventoId });

    res.status(201).json({
      success: true,
      data: etapa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const findAll = async (req, res) => {
  try {
    const etapas = await Etapa.findAll();
    res.json({ success: true, data: etapas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const findOne = async (req, res) => {
  try {
    const etapa = await Etapa.findByPk(req.params.id);
    if (!etapa) {
      return res.status(404).json({ success: false, error: 'Etapa no encontrada' });
    }
    res.json({ success: true, data: etapa });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const [updated] = await Etapa.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedEtapa = await Etapa.findByPk(req.params.id);
      res.json({ success: true, data: updatedEtapa });
    } else {
      res.status(404).json({ success: false, error: 'Etapa no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const etapa = await Etapa.findByPk(req.params.id);
    if (!etapa) {
      return res.status(404).json({ success: false, error: 'Etapa no encontrada' });
    }
    await etapa.destroy();
    res.json({ success: true, message: 'Etapa eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const findAllByEventoId = async (req, res) => {
  try {
    const { eventoId } = req.query;

    if (!eventoId) {
      return res.status(400).json({ success: false, error: 'Falta el parámetro eventoId' });
    }

    const etapas = await Etapa.findAll({
      where: { eventoId: parseInt(eventoId, 10) },
      order: [['inicio', 'ASC']]
    });

    res.json({ success: true, data: etapas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// cambiar visivilidad de etapa completa
const toggleVisibility = async (req, res) => {
  try {
    const etapa = await Etapa.findByPk(req.params.id);
    if (!etapa) {
      return res.status(404).json({ success: false, error: 'Etapa no encontrada' });
    }
    const newVisibility = !etapa.visible;
    await etapa.update({ visible: newVisibility });
    res.json({ success: true, message: 'Visibilidad de etapa actualizada', visible: newVisibility });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// New controller to toggle visibility of specific ticket types
const toggleTicketTypeVisibility = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validar el formato de 'updates'. Debe ser un objeto con claves string y valores 'visible' o 'invisible'.
  const updatesSchema = Joi.object().pattern(Joi.string(), Joi.string().valid('visible', 'invisible').required());

  const { error } = updatesSchema.validate(updates);
  if (error) {
    console.error('Validation error for toggleTicketTypeVisibility:', error.details[0].message);
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const etapa = await Etapa.findByPk(id);
    if (!etapa) {
      return res.status(404).json({ success: false, error: 'Etapa no encontrada' });
    }

    // SOLUCIÓN APLICADA: Clonar el objeto visibles_por_tipo para asegurar que Sequelize detecte los cambios.
    const currentVisiblesPorTipo = { ...(etapa.visibles_por_tipo || {}) }; // Asegúrate de que siempre sea un objeto

    let changesMade = false;

    // Aplicar las actualizaciones
    for (const type in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, type)) {
        if (currentVisiblesPorTipo[type] !== updates[type]) {
          currentVisiblesPorTipo[type] = updates[type];
          changesMade = true;
        }
      }
    }

    if (changesMade) {
      await etapa.update({ visibles_por_tipo: currentVisiblesPorTipo });
      console.log(`Visibilidad actualizada para etapa ${id}. Nuevos valores:`, etapa.visibles_por_tipo);
      res.json({
        success: true,
        message: 'Visibilidad de tipos de ticket actualizada',
        data: etapa.visibles_por_tipo
      });
    } else {
      console.log(`No se realizaron cambios para etapa ${id}.`);
      res.status(200).json({
        success: true,
        message: 'No se realizaron cambios de visibilidad',
        data: etapa.visibles_por_tipo
      });
    }
  } catch (error) {
    console.error('Error interno del servidor al cambiar la visibilidad del tipo de ticket:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al cambiar la visibilidad del tipo de ticket.' });
  }
};

module.exports = {
  create,
  findAll,
  findOne,
  update,
  remove,
  findAllByEventoId,
  toggleVisibility,
  toggleTicketTypeVisibility
};