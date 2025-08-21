const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');
const { Carrito, Compra, ItemCarrito, sequelize } = require('../database/models');
const ticketController = require('./ticketController');
const crypto = require('crypto');
const transporter = require('../config/email');
const CartService = require('../services/cartService');

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});
const paymentClient = new Payment(client);
const preferenceClient = new Preference(client);

exports.crearPreferenciaPago = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { carritoId, nombres, apellidos, cedula, correo } = req.body;
        const userId = req.user.id;

        // 1. Validar carrito y obtener items
        const carrito = await Carrito.findOne({
            where: { id: carritoId, user_id: userId },
            include: [{ model: ItemCarrito, as: 'items' }],
            transaction
        });

        if (!carrito) throw new Error('Carrito no encontrado');
        if (carrito.estado !== 'activo') throw new Error('Carrito no disponible');
        if (carrito.items.length === 0) throw new Error('Carrito vacío');

        // 2. Crear la compra
        const compra = await Compra.create({
            userId,
            carritoId: carrito.id,
            estado: 'pendiente',
            metodo_pago: 'mercado_pago',
            precio_total: carrito.total,
            precio_servicio: carrito.precio_servicio,
            total_tickets: carrito.total_tickets,
            fecha_limite: new Date(Date.now() + 45 * 60 * 1000),
            hash_contenido: carrito.hash_contenido,
            nombres,
            apellidos,
            cedula,
            correo
        }, { transaction });

        // 3. Copiar items del carrito a CompraItem
        const itemsCopiados = await Promise.all(carrito.items.map(async item => {
            return sequelize.models.CompraItem.create({
                compraId: compra.id,
                tipo: item.tipo,
                etapaId: item.etapaId,
                paqueteId: item.paqueteId,
                palcoId: item.palcoId,
                cantidad: item.cantidad,
                precio: item.precio,
                tipoTicket: item.tipoTicket,
                ticketsPaquete: item.ticketsPaquete,
                totalTickets: item.totalTickets,
                eventoId: item.eventoId
            }, { transaction });
        }));

        // 4. Generar hash de los items copiados
        const contenidoHash = crypto.createHash('sha256').update(
            JSON.stringify(itemsCopiados.map(i => i.id))
        ).digest('hex');

        await compra.update({ hash_contenido: contenidoHash }, { transaction });

        // 5. Crear el item que se apsa a la preferencia
        const itemMP = {
            id: carrito.id.toString(),
            title: `Carrito de ${req.user.username}`,
            picture_url: "https://images.hardcodecol.com/otros/gracias-x-compra.webp",
            unit_price: Math.round(Number(carrito.total)),
            quantity: 1,
            currency_id: 'COP',
            description: "Gracias por su compra :)",
        };

        // 6. Crear preferencia con item único
        const preference = await preferenceClient.create({
            body: {
                items: [itemMP],
                external_reference: compra.id.toString(),
                notification_url: `https://backend.hardcodecol.com/api/pagos/webhook`,
                currency_id: 'COP',
                site_id: 'MCO',
                expires: true,
                expiration_date_from: new Date().toISOString(),
                expiration_date_to: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                back_urls: {
                    success: 'https://hardcodecol.com/dashboard',
                    failure: 'https://hardcodecol.com/dashboard',
                    pending: 'https://hardcodecol.com/dashboard'
                },
                auto_return: 'approved',
            }
        });

        console.log("Preferencia de pago creada:", preference.id);

        await transaction.commit();
        res.json({
            id: preference.id,
            init_point: preference.init_point
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear preferencia:', error);
        res.status(500).json({ error: error.message || 'Error al crear preferencia' });
    }
};

exports.webhookMercadoPago = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        // 1. Extraer datos del webhook
        const { type, data } = req.body;

        // Validar tipo de evento
        if (type !== 'payment') return res.status(200).send('OK');

        // 2. Obtener el ID del pago
        const paymentId = data.id;

        // 3. Consultar la API de MercadoPago usando el SDK
        const payment = await paymentClient.get({ id: paymentId });
        console.log("Se registraron datos de pago");

        // 4. Obtener la compra asociada
        const compra = await Compra.findByPk(payment.external_reference, {
            include: [
                {
                    model: sequelize.models.CompraItem,
                    as: 'items',
                    include: [
                        {
                            model: sequelize.models.Etapa,
                            as: 'etapa',
                            include: [{
                                model: sequelize.models.Evento,
                                as: 'evento',
                                attributes: ['nombre', 'fecha_inicio', 'fecha_fin', 'ubicacion', 'ciudad']
                            }]
                        },
                        {
                            model: sequelize.models.Paquete,
                            as: 'paquete',
                            attributes: ['nombre']
                        },
                        {
                            model: sequelize.models.Palco,
                            as: 'palco',
                            attributes: ['nombre']
                        }
                    ]
                },
                {
                    model: Carrito,
                    as: 'carrito'
                }
            ],
            transaction
        });

        if (!compra) throw new Error('Compra no encontrada');

        // Verificar si la compra ya está en estado 'pagado' para evitar duplicados
        if (compra.estado === 'pagado') {
            await transaction.commit();
            return res.status(200).send('OK');
        }

        // 5. Validar integridad de los items copiados
        const contenidoActual = crypto.createHash('sha256').update(
            JSON.stringify(compra.items.map(i => i.id))
        ).digest('hex');

        if (contenidoActual !== compra.hash_contenido) {
            throw new Error('Los items de la compra fueron modificados');
        }

        // 6. Procesar según el estado del pago
        switch (payment.status) {
            case 'approved':
                // Actualizar compra con datos reales
                await compra.update({
                    estado: 'pagado',
                    fecha_pago: new Date(),
                    mercadoPagoId: paymentId,
                    metodo_pago: payment.payment_type_id,
                    precio_total: payment.transaction_amount,
                    precio_servicio: compra.precio_servicio // Mantener el original
                }, { transaction });

                // Generar tickets desde los items copiados
                await this.generarTicketsDesdeCompra(compra, transaction);

                // Vaciar el carrito de compras del usuario
                if (compra.carritoId) {
                    await CartService.clearUserCart(compra.userId);
                }

                // *** Lógica para enviar el correo de confirmación ***
                try {
                    const itemsHtml = compra.items.map(item => {
                        const nombreEvento = item.etapa?.evento?.nombre || 'Evento Desconocido';
                        let tipoItem = '';

                        if (item.tipo === 'ticket') {
                            tipoItem = `Tipo de Ticket: ${item.tipoTicket || 'General'}`;
                        } else if (item.tipo === 'paquete') {
                            tipoItem = `Paquete: ${item.paquete?.nombre || 'Desconocido'}`;
                        } else if (item.tipo === 'palco') {
                            tipoItem = `Palco: ${item.palco?.nombre || 'Desconocido'}`;
                        }

                        return `
                            <div style="background-color: #f0f0f0; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                                <h3 style="color: #003366; margin-top: 0;">${nombreEvento}</h3>
                                <p style="margin: 5px 0;">
                                    <strong>${tipoItem}</strong> <br>
                                    <strong>Cantidad:</strong> ${item.cantidad} <br>
                                    <strong>Precio Unitario:</strong> $${(item.precio / item.cantidad).toLocaleString('es-CO')} COP <br>
                                    <strong>Precio Total:</strong> $${item.precio.toLocaleString('es-CO')} COP
                                </p>
                            </div>
                        `;
                    }).join('');

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: compra.correo,
                        subject: '¡Tu compra en tickeventos.com ha sido confirmada!',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #fff; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                                <div style="background-color: #003366; padding: 25px; text-align: center;">
                                    <h1 style="color: #fff; margin: 0; font-size: 28px;">¡Compra Confirmada! 🎉</h1>
                                </div>
                                <div style="padding: 30px; color: #333;">
                                    <p style="font-size: 16px; line-height: 1.6;">Hola <strong style="color: #003366;">${compra.nombres || ''} ${compra.apellidos || ''}</strong>,</p>
                                    <p style="font-size: 16px; line-height: 1.6;">¡Gracias por tu compra en tickeventos.com! Tu transacción ha sido procesada exitosamente.</p>
                                    <p style="font-size: 18px; font-weight: bold; color: #003366;">Detalles de tu compra:</p>
                                    <ul style="list-style-type: none; padding: 0;">
                                        <li style="font-size: 16px; margin-bottom: 5px;"><strong>ID de Compra:</strong> ${compra.id}</li>
                                        <li style="font-size: 16px; margin-bottom: 5px;"><strong>Fecha de Pago:</strong> ${new Date(compra.fecha_pago).toLocaleString('es-CO')}</li>
                                        <li style="font-size: 16px; margin-bottom: 5px;"><strong>Método de Pago:</strong> ${payment.payment_type_id}</li>
                                    </ul>
                                    <p style="background-color: #e6f7ff; color: #003366; padding: 15px; text-align: center; font-size: 20px; font-weight: bold; margin: 25px 0; border-radius: 8px;">
                                        Monto Total Pagado: $${compra.precio_total.toLocaleString('es-CO')} COP
                                    </p>
                                    <p style="font-size: 18px; font-weight: bold; color: #003366; margin-top: 25px;">Tickets Incluidos:</p>
                                    <div>
                                        ${itemsHtml}
                                    </div>
                                    <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Puedes ver tus tickets y el estado de tu compra en tu panel de usuario en nuestra página web.</p>
                                    <p style="font-size: 16px; font-weight: bold; color: #003366;">tickeventos.com</p>
                                </div>
                                <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                                    Este es un correo electrónico generado automáticamente. Por favor, no lo respondas.
                                </div>
                            </div>
                        `,
                    };
                    await transporter.sendMail(mailOptions);
                    console.log('Correo de confirmación enviado exitosamente.');
                } catch (emailError) {
                    console.error('Error al enviar correo de confirmación:', emailError);
                }
                // *** Fin de la lógica para enviar el correo de confirmación ***
                break;

            case 'cancelled':
            case 'rejected':
                await compra.update({
                    estado: 'cancelado',
                    mercadoPagoId: paymentId
                }, { transaction });
                break;

            case 'pending':
                await compra.update({
                    estado: 'pendiente',
                    mercadoPagoId: paymentId,
                }, { transaction });
                break;

            default:
                console.log(`Estado de pago no manejado: ${payment.status}`);
                break;
        }

        await transaction.commit();
        res.status(200).send('OK');
    } catch (error) {
        await transaction.rollback();
        console.error('Error en webhook:', error);
        res.status(500).json({
            error: error.message || 'Error en webhook',
            details: error.response?.data || null
        });
    }
};

exports.generarTicketsDesdeCompra = async (compra, transaction) => {
    try {
        for (const item of compra.items) {
            // Validar campos obligatorios según el tipo de ítem
            if (item.tipo === 'ticket' && (!item.etapaId || !item.tipoTicket)) {
                console.error(`Item ${item.id} (ticket) no tiene etapaId o tipoTicket válido`);
                continue;
            }

            if ((item.tipo === 'paquete' || item.tipo === 'palco') && !item.etapaId) {
                console.error(`Item ${item.id} (${item.tipo}) no tiene etapaId válido`);
                continue;
            }

            // Determinar cuántos tickets crear según el tipo de ítem
            let cantidadTickets = 0;
            if (item.tipo === 'ticket') {
                cantidadTickets = item.cantidad;
            } else if (item.tipo === 'paquete') {
                cantidadTickets = item.cantidad * (item.ticketsPaquete || 1);
            } else if (item.tipo === 'palco') {
                // Se asume que item.palco está precargado en la consulta de la compra
                if (!item.palco || !item.palco.cantidadTickets) {
                    console.error(`No se pudo obtener la cantidad de tickets del palco para el item ${item.id}`);
                    continue;
                }
                cantidadTickets = item.palco.cantidadTickets;
            }

            // Crear los tickets
            for (let i = 0; i < cantidadTickets; i++) {
                await ticketController.createTicket({
                    userId: compra.userId,
                    etapaId: item.etapaId,
                    tipo: item.tipoTicket || 'General',
                    compraId: compra.id,
                    carritoId: compra.carritoId,
                    paqueteId: item.paqueteId,
                    palcoId: item.palcoId
                }, transaction);
            }
        }
    } catch (error) {
        console.error('Error al generar tickets:', error);
        throw error;
    }
};