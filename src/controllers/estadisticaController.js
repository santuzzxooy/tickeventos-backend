const { Ticket, Etapa, Evento, Paquete, Compra } = require('../database/models');
const { Op } = require('sequelize');

exports.getEventStatistics = async (req, res) => {
  try {
    const { eventoId } = req.params; // eventoId es obligatorio
    const { etapaId } = req.query;  // etapaId es opcional, viene como query parameter

    if (!eventoId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento para obtener las estadísticas.'
      });
    }

    // Construir el objeto de condiciones 'where' dinámicamente
    const whereConditions = {
      eventoId: eventoId,
      etapaId: {
        [Op.not]: null // Siempre consideramos tickets con etapaId no nula
      }
    };

    // Si se proporciona un etapaId, lo añadimos a las condiciones de búsqueda
    if (etapaId) {
      whereConditions.etapaId = etapaId; // Sobrescribe la condición si se especifica un etapaId
    }

    // 1. Obtener todos los tickets vendidos para el evento (y opcionalmente la etapa)
    // Incluir Etapa para obtener precios_por_tipo y Paquete para el descuento
    const tickets = await Ticket.findAll({
      where: whereConditions, // Usamos las condiciones construidas dinámicamente
      include: [
        {
          model: Etapa,
          as: 'etapa',
          attributes: ['precios_por_tipo', 'nombre'], // Añadimos 'nombre' de etapa para el output si es útil
          required: true // Solo tickets que tienen una etapa asociada
        },
        {
          model: Paquete,
          as: 'paquete',
          attributes: ['descuento', 'cantidadTickets', 'nombre'], // Añadimos 'nombre' de paquete
          required: false // Los tickets pueden o no estar asociados a un paquete
        }
      ]
    });

    let totalTicketsVendidos = 0;
    let valorTotalVendido = 0;
    let ingresosPorTipoTicket = {};
    let conteoTicketsPorTipo = {}; // Nuevo: Conteo de tickets por tipo
    let conteoTicketsPorTipoConPaquete = {}; // Nuevo: Conteo de tickets por tipo que provienen de paquete
    let conteoTicketsPorTipoSinPaquete = {}; // Nuevo: Conteo de tickets por tipo que NO provienen de paquete
    let ingresosPorTipoTicketConPaquete = {}; // Nuevo: Ingresos de tickets por tipo que provienen de paquete
    let ingresosPorTipoTicketSinPaquete = {}; // Nuevo: Ingresos de tickets por tipo que NO provienen de paquete

    for (const ticket of tickets) {
      totalTicketsVendidos++;

      // Inicializar contadores si el tipo de ticket es nuevo
      if (!conteoTicketsPorTipo[ticket.tipo]) {
        conteoTicketsPorTipo[ticket.tipo] = 0;
        conteoTicketsPorTipoConPaquete[ticket.tipo] = 0;
        conteoTicketsPorTipoSinPaquete[ticket.tipo] = 0;
        ingresosPorTipoTicketConPaquete[ticket.tipo] = 0;
        ingresosPorTipoTicketSinPaquete[ticket.tipo] = 0;
      }
      conteoTicketsPorTipo[ticket.tipo]++;

      // Precio base del ticket desde la etapa
      let precioUnitario = ticket.etapa.precios_por_tipo?.[ticket.tipo];

      if (precioUnitario === undefined || precioUnitario === null) {
        console.warn(`[ADVERTENCIA] Tipo de ticket '${ticket.tipo}' no encontrado en precios_por_tipo para la etapa ${ticket.etapaId}. Este ticket no contribuirá al valor total vendido.`);
        continue;
      }

      let precioCalculado = precioUnitario;

      // Aplicar descuento si el ticket está asociado a un paquete
      if (ticket.paquete) {
        const descuento = ticket.paquete.descuento || 0;
        precioCalculado = precioUnitario * (1 - descuento);
        conteoTicketsPorTipoConPaquete[ticket.tipo]++;
        ingresosPorTipoTicketConPaquete[ticket.tipo] += precioCalculado;
      } else {
        conteoTicketsPorTipoSinPaquete[ticket.tipo]++;
        ingresosPorTipoTicketSinPaquete[ticket.tipo] += precioCalculado;
      }
      valorTotalVendido += precioCalculado;

      // Acumular ingresos por tipo de ticket
      if (!ingresosPorTipoTicket[ticket.tipo]) {
        ingresosPorTipoTicket[ticket.tipo] = 0;
      }
      ingresosPorTipoTicket[ticket.tipo] += precioCalculado;
    }

    // Calcular porcentajes de ingresos por tipo de ticket
    const porcentajeIngresosPorTipoTicket = {};
    for (const tipo in ingresosPorTipoTicket) {
      if (ingresosPorTipoTicket.hasOwnProperty(tipo)) {
        porcentajeIngresosPorTipoTicket[tipo] = parseFloat(((ingresosPorTipoTicket[tipo] / valorTotalVendido) * 100).toFixed(2));
      }
    }

    // Nuevo: Calcular porcentajes de tickets por tipo (con y sin paquete)
    const porcentajeTicketsPorTipoConPaquete = {};
    const porcentajeTicketsPorTipoSinPaquete = {};
    const porcentajeIngresosPorTipoTicketConPaquete = {};
    const porcentajeIngresosPorTipoTicketSinPaquete = {};


    for (const tipo in conteoTicketsPorTipo) {
      if (conteoTicketsPorTipo.hasOwnProperty(tipo)) {
        // Porcentajes de cantidad de tickets
        if (conteoTicketsPorTipo[tipo] > 0) {
          porcentajeTicketsPorTipoConPaquete[tipo] = parseFloat(((conteoTicketsPorTipoConPaquete[tipo] / conteoTicketsPorTipo[tipo]) * 100).toFixed(2));
          porcentajeTicketsPorTipoSinPaquete[tipo] = parseFloat(((conteoTicketsPorTipoSinPaquete[tipo] / conteoTicketsPorTipo[tipo]) * 100).toFixed(2));
        } else {
          porcentajeTicketsPorTipoConPaquete[tipo] = 0;
          porcentajeTicketsPorTipoSinPaquete[tipo] = 0;
        }

        // Porcentajes de ingresos por tipo de ticket (respecto al ingreso total de ese tipo)
        if (ingresosPorTipoTicket[tipo] > 0) {
          porcentajeIngresosPorTipoTicketConPaquete[tipo] = parseFloat(((ingresosPorTipoTicketConPaquete[tipo] / ingresosPorTipoTicket[tipo]) * 100).toFixed(2));
          porcentajeIngresosPorTipoTicketSinPaquete[tipo] = parseFloat(((ingresosPorTipoTicketSinPaquete[tipo] / ingresosPorTipoTicket[tipo]) * 100).toFixed(2));
        } else {
          porcentajeIngresosPorTipoTicketConPaquete[tipo] = 0;
          porcentajeIngresosPorTipoTicketSinPaquete[tipo] = 0;
        }
      }
    }


    // Opcional: Si se filtró por etapa, podemos incluir el nombre de la etapa en la respuesta.
    let nombreEtapa = null;
    if (etapaId) {
      if (tickets.length > 0) {
        nombreEtapa = tickets[0].etapa.nombre;
      } else {
        const etapaUnica = await Etapa.findByPk(etapaId, {
          attributes: ['nombre'],
          where: { eventoId: eventoId }
        });
        if (etapaUnica) {
          nombreEtapa = etapaUnica.nombre;
        }
      }
    }

    res.status(200).json({
      success: true,
      eventoId: eventoId,
      etapaId: etapaId || null,
      nombreEtapa: nombreEtapa,
      totalTicketsVendidos: totalTicketsVendidos,
      valorTotalVendido: parseFloat(valorTotalVendido.toFixed(2)),
      ingresosPorTipoTicket: Object.keys(ingresosPorTipoTicket).length > 0 ? ingresosPorTipoTicket : null,
      porcentajeIngresosPorTipoTicket: Object.keys(porcentajeIngresosPorTipoTicket).length > 0 ? porcentajeIngresosPorTipoTicket : null,
      conteoTicketsPorTipo: Object.keys(conteoTicketsPorTipo).length > 0 ? conteoTicketsPorTipo : null, // Nuevo
      ticketsConPaquetePorTipo: Object.keys(conteoTicketsPorTipoConPaquete).length > 0 ? conteoTicketsPorTipoConPaquete : null, // Nuevo
      ticketsSinPaquetePorTipo: Object.keys(conteoTicketsPorTipoSinPaquete).length > 0 ? conteoTicketsPorTipoSinPaquete : null, // Nuevo
      porcentajeTicketsPorTipoConPaquete: Object.keys(porcentajeTicketsPorTipoConPaquete).length > 0 ? porcentajeTicketsPorTipoConPaquete : null, // Nuevo
      porcentajeTicketsPorTipoSinPaquete: Object.keys(porcentajeTicketsPorTipoSinPaquete).length > 0 ? porcentajeTicketsPorTipoSinPaquete : null, // Nuevo
      ingresosPorTipoTicketConPaquete: Object.keys(ingresosPorTipoTicketConPaquete).length > 0 ? ingresosPorTipoTicketConPaquete : null, // Nuevo
      ingresosPorTipoTicketSinPaquete: Object.keys(ingresosPorTipoTicketSinPaquete).length > 0 ? ingresosPorTipoTicketSinPaquete : null, // Nuevo
      porcentajeIngresosPorTipoTicketConPaquete: Object.keys(porcentajeIngresosPorTipoTicketConPaquete).length > 0 ? porcentajeIngresosPorTipoTicketConPaquete : null, // Nuevo
      porcentajeIngresosPorTipoTicketSinPaquete: Object.keys(porcentajeIngresosPorTipoTicketSinPaquete).length > 0 ? porcentajeIngresosPorTipoTicketSinPaquete : null // Nuevo
    });

  } catch (error) {
    console.error('Error al obtener estadísticas del evento/etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener las estadísticas.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


exports.getIngresoStatistics = async (req, res) => {
  try {
    const { eventoId } = req.params; // eventoId es obligatorio
    const { etapaId } = req.query;  // etapaId es opcional, viene como query parameter

    if (!eventoId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del evento para obtener las estadísticas de ingreso.'
      });
    }

    const whereConditions = {
      eventoId: eventoId,
      etapaId: {
        [Op.not]: null // Siempre consideramos tickets con etapaId no nula
      }
    };

    if (etapaId) {
      whereConditions.etapaId = etapaId;
    }

    const tickets = await Ticket.findAll({
      where: whereConditions,
      include: [
        {
          model: Etapa,
          as: 'etapa',
          attributes: ['precios_por_tipo', 'nombre'],
          required: true
        },
        {
          model: Paquete,
          as: 'paquete',
          attributes: ['descuento', 'cantidadTickets', 'nombre'],
          required: false
        }
      ]
    });

    let totalTicketsVendidos = tickets.length;
    let totalTicketsIngresados = 0;
    let totalTicketsNoIngresados = 0;
    let valorTotalIngresado = 0;
    let valorTotalNoIngresado = 0;

    let ingresosPorTipoTicketIngresado = {};
    let ingresosPorTipoTicketNoIngresado = {};
    let conteoTicketsPorTipoIngresado = {};
    let conteoTicketsPorTipoNoIngresado = {};

    for (const ticket of tickets) {
      let precioUnitario = ticket.etapa.precios_por_tipo?.[ticket.tipo];

      if (precioUnitario === undefined || precioUnitario === null) {
        console.warn(`[ADVERTENCIA] Tipo de ticket '${ticket.tipo}' no encontrado en precios_por_tipo para la etapa ${ticket.etapaId}. Este ticket no contribuirá a las estadísticas de ingreso.`);
        continue;
      }

      let precioCalculado = precioUnitario;
      if (ticket.paquete) {
        const descuento = ticket.paquete.descuento || 0;
        precioCalculado = precioUnitario * (1 - descuento);
      }

      // Inicializar contadores si el tipo de ticket es nuevo
      if (!ingresosPorTipoTicketIngresado[ticket.tipo]) {
        ingresosPorTipoTicketIngresado[ticket.tipo] = 0;
        ingresosPorTipoTicketNoIngresado[ticket.tipo] = 0;
        conteoTicketsPorTipoIngresado[ticket.tipo] = 0;
        conteoTicketsPorTipoNoIngresado[ticket.tipo] = 0;
      }

      if (ticket.usado) {
        totalTicketsIngresados++;
        valorTotalIngresado += precioCalculado;
        ingresosPorTipoTicketIngresado[ticket.tipo] += precioCalculado;
        conteoTicketsPorTipoIngresado[ticket.tipo]++;
      } else {
        totalTicketsNoIngresados++;
        valorTotalNoIngresado += precioCalculado;
        ingresosPorTipoTicketNoIngresado[ticket.tipo] += precioCalculado;
        conteoTicketsPorTipoNoIngresado[ticket.tipo]++;
      }
    }

    // Calcular porcentajes de tickets ingresados/no ingresados
    const porcentajeTicketsIngresados = totalTicketsVendidos > 0 ? parseFloat(((totalTicketsIngresados / totalTicketsVendidos) * 100).toFixed(2)) : 0;
    const porcentajeTicketsNoIngresados = totalTicketsVendidos > 0 ? parseFloat(((totalTicketsNoIngresados / totalTicketsVendidos) * 100).toFixed(2)) : 0;

    // Calcular porcentajes de ingresos ingresados/no ingresados
    const valorTotalVendido = valorTotalIngresado + valorTotalNoIngresado; // Re-calculate total value based on actual processed tickets
    const porcentajeValorIngresado = valorTotalVendido > 0 ? parseFloat(((valorTotalIngresado / valorTotalVendido) * 100).toFixed(2)) : 0;
    const porcentajeValorNoIngresado = valorTotalVendido > 0 ? parseFloat(((valorTotalNoIngresado / valorTotalVendido) * 100).toFixed(2)) : 0;

    // Calcular porcentajes de tickets por tipo (ingresados vs. no ingresados, dentro de su propio tipo)
    const porcentajeTicketsPorTipoIngresado = {};
    const porcentajeTicketsPorTipoNoIngresado = {};
    const porcentajeIngresosPorTipoTicketIngresado = {};
    const porcentajeIngresosPorTipoTicketNoIngresado = {};


    // Aggregate total count and total income for each ticket type across both 'usado' states
    const totalConteoPorTipo = {};
    const totalIngresosPorTipo = {};

    for (const tipo in conteoTicketsPorTipoIngresado) {
      totalConteoPorTipo[tipo] = (totalConteoPorTipo[tipo] || 0) + conteoTicketsPorTipoIngresado[tipo];
    }
    for (const tipo in conteoTicketsPorTipoNoIngresado) {
      totalConteoPorTipo[tipo] = (totalConteoPorTipo[tipo] || 0) + conteoTicketsPorTipoNoIngresado[tipo];
    }
    for (const tipo in ingresosPorTipoTicketIngresado) {
      totalIngresosPorTipo[tipo] = (totalIngresosPorTipo[tipo] || 0) + ingresosPorTipoTicketIngresado[tipo];
    }
    for (const tipo in ingresosPorTipoTicketNoIngresado) {
      totalIngresosPorTipo[tipo] = (totalIngresosPorTipo[tipo] || 0) + ingresosPorTipoTicketNoIngresado[tipo];
    }


    for (const tipo in totalConteoPorTipo) {
      if (totalConteoPorTipo.hasOwnProperty(tipo)) {
        if (totalConteoPorTipo[tipo] > 0) {
          porcentajeTicketsPorTipoIngresado[tipo] = parseFloat(((conteoTicketsPorTipoIngresado[tipo] / totalConteoPorTipo[tipo]) * 100).toFixed(2));
          porcentajeTicketsPorTipoNoIngresado[tipo] = parseFloat(((conteoTicketsPorTipoNoIngresado[tipo] / totalConteoPorTipo[tipo]) * 100).toFixed(2));
        } else {
          porcentajeTicketsPorTipoIngresado[tipo] = 0;
          porcentajeTicketsPorTipoNoIngresado[tipo] = 0;
        }

        if (totalIngresosPorTipo[tipo] > 0) {
          porcentajeIngresosPorTipoTicketIngresado[tipo] = parseFloat(((ingresosPorTipoTicketIngresado[tipo] / totalIngresosPorTipo[tipo]) * 100).toFixed(2));
          porcentajeIngresosPorTipoTicketNoIngresado[tipo] = parseFloat(((ingresosPorTipoTicketNoIngresado[tipo] / totalIngresosPorTipo[tipo]) * 100).toFixed(2));
        } else {
          porcentajeIngresosPorTipoTicketIngresado[tipo] = 0;
          porcentajeIngresosPorTipoTicketNoIngresado[tipo] = 0;
        }
      }
    }


    let nombreEtapa = null;
    if (etapaId) {
      if (tickets.length > 0) {
        nombreEtapa = tickets[0].etapa.nombre;
      } else {
        const etapaUnica = await Etapa.findByPk(etapaId, {
          attributes: ['nombre'],
          where: { eventoId: eventoId }
        });
        if (etapaUnica) {
          nombreEtapa = etapaUnica.nombre;
        }
      }
    }

    res.status(200).json({
      success: true,
      eventoId: eventoId,
      etapaId: etapaId || null,
      nombreEtapa: nombreEtapa,
      totalTicketsVendidos: totalTicketsVendidos,
      totalTicketsIngresados: totalTicketsIngresados,
      totalTicketsNoIngresados: totalTicketsNoIngresados,
      porcentajeTicketsIngresados: porcentajeTicketsIngresados,
      porcentajeTicketsNoIngresados: porcentajeTicketsNoIngresados,
      valorTotalIngresado: parseFloat(valorTotalIngresado.toFixed(2)),
      valorTotalNoIngresado: parseFloat(valorTotalNoIngresado.toFixed(2)),
      porcentajeValorIngresado: porcentajeValorIngresado,
      porcentajeValorNoIngresado: porcentajeValorNoIngresado,
      ingresosPorTipoTicketIngresado: Object.keys(ingresosPorTipoTicketIngresado).length > 0 ? ingresosPorTipoTicketIngresado : null,
      ingresosPorTipoTicketNoIngresado: Object.keys(ingresosPorTipoTicketNoIngresado).length > 0 ? ingresosPorTipoTicketNoIngresado : null,
      conteoTicketsPorTipoIngresado: Object.keys(conteoTicketsPorTipoIngresado).length > 0 ? conteoTicketsPorTipoIngresado : null,
      conteoTicketsPorTipoNoIngresado: Object.keys(conteoTicketsPorTipoNoIngresado).length > 0 ? conteoTicketsPorTipoNoIngresado : null,
      porcentajeTicketsPorTipoIngresado: Object.keys(porcentajeTicketsPorTipoIngresado).length > 0 ? porcentajeTicketsPorTipoIngresado : null,
      porcentajeTicketsPorTipoNoIngresado: Object.keys(porcentajeTicketsPorTipoNoIngresado).length > 0 ? porcentajeTicketsPorTipoNoIngresado : null,
      porcentajeIngresosPorTipoTicketIngresado: Object.keys(porcentajeIngresosPorTipoTicketIngresado).length > 0 ? porcentajeIngresosPorTipoTicketIngresado : null,
      porcentajeIngresosPorTipoTicketNoIngresado: Object.keys(porcentajeIngresosPorTipoTicketNoIngresado).length > 0 ? porcentajeIngresosPorTipoTicketNoIngresado : null
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de ingreso del evento/etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener las estadísticas de ingreso.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};