exports.validateItem = (req, res, next) => {
    const { tipo, etapaId, eventoId, carritoId } = req.body;
    
    // Validar tipo de item
    if (!['ticket', 'paquete'].includes(tipo)) {
        return res.status(400).json({ 
            success: false,
            error: 'Tipo de item inválido. Debe ser "ticket" o "paquete"' 
        });
    }
    
    // Validaciones comunes para todos los items
    const missingFields = [];
    if (!etapaId) missingFields.push('etapaId');
    if (!eventoId) missingFields.push('eventoId');
    if (!carritoId) missingFields.push('carritoId');
    
    if (missingFields.length > 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Datos incompletos',
            missingFields
        });
    }
    
    // Validaciones específicas
    if (tipo === 'ticket' && !req.body.tipoTicket) {
        return res.status(400).json({ 
            success: false,
            error: 'Para tickets, tipoTicket es requerido',
            requiredFields: ['tipoTicket']
        });
    }
    
    if (tipo === 'paquete' && !req.body.paqueteId) {
        return res.status(400).json({ 
            success: false,
            error: 'Para paquetes, paqueteId es requerido',
            requiredFields: ['paqueteId']
        });
    }
    
    next();
};


exports.validateUpdateItem = (req, res, next) => {
    const { cantidad, tipoTicket } = req.body;
    
    // Validar que al menos un campo a actualizar esté presente
    if (!cantidad && !tipoTicket) {
        return res.status(400).json({ 
            success: false,
            error: 'Se requiere al menos un campo para actualizar (cantidad o tipoTicket)'
        });
    }
    
    // Validar tipos de datos
    if (cantidad && (typeof cantidad !== 'number' || cantidad <= 0)) {
        return res.status(400).json({ 
            success: false,
            error: 'La cantidad debe ser un número mayor que 0'
        });
    }
    
    if (tipoTicket && typeof tipoTicket !== 'string') {
        return res.status(400).json({ 
            success: false,
            error: 'tipoTicket debe ser una cadena de texto'
        });
    }
    
    next();
};


exports.validateRemoveItem = (req, res, next) => {
    const { id } = req.params;
    
    // Validar que el ID esté presente y sea válido
    if (!id || typeof id !== 'string' || id.trim() === '') {
        return res.status(400).json({ 
            success: false,
            error: 'ID de item inválido o faltante'
        });
    }
    
    next();
};