const { Paquete, Etapa } = require('../database/models');

exports.create = async (req, res) => {
  try {
    const {
      eventoId,
      etapaId,
      nombre,
      descripcion,
      cantidadTickets,
      tipoTicket,
      descuento,
      carritoId,
      compraId
    } = req.body;

    const etapa = await Etapa.findByPk(etapaId);
    if (!etapa) return res.status(404).json({ error: 'Etapa no encontrada' });

    const precioUnitario = etapa.precios_por_tipo?.[tipoTicket];
    if (!precioUnitario) return res.status(400).json({ error: 'Tipo de ticket no válido para esta etapa' });

    const precioFinal = (precioUnitario * cantidadTickets) * (1 - descuento);

    const paquete = await Paquete.create({
      eventoId,
      etapaId,
      nombre,
      descripcion,
      cantidadTickets,
      tipoTicket,
      descuento,
      precio: precioFinal,
      disponible: true,
      carritoId,
      compraId
    });

    res.status(201).json(paquete);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const paquetes = await Paquete.findAll();
    res.json(paquetes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


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
        // Aquí puedes incluir relaciones si las necesitas
        // Por ejemplo: { model: Etapa, as: 'etapa' }
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

// Cambiar visivilidad de paquete
exports.toggleVisibility = async (req, res) => {
  try {
    const paquete = await Paquete.findByPk(req.params.id);
    if (!paquete) {
      return res.status(404).json({ success: false, error: 'Paquete no encontrado' });
    }
    await paquete.update({ visible: !paquete.visible });
    res.json({ success: true, data: paquete });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};