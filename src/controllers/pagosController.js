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
                        const nombreEtapa = item.etapa?.nombre ? ` - Etapa: ${item.etapa.nombre}` : '';
                        const nombrePaquete = item.paquete?.nombre ? ` - Paquete: ${item.paquete.nombre}` : '';
                        const tipoTicket = item.tipoTicket ? ` (${item.tipoTicket})` : '';

                        return `
                            <p style="margin: 5px 0;">
                                <strong>Evento:</strong> ${nombreEvento}${nombreEtapa}${nombrePaquete} <br>
                                <strong>Tipo de Ticket:</strong> ${tipoTicket} <br>
                                <strong>Cantidad:</strong> ${item.cantidad} <br>
                                <strong>Precio Unitario:</strong> $${(item.precio / item.cantidad).toLocaleString('es-CO')} COP <br>
                                <strong>Precio total:</strong> $${item.precio.toLocaleString('es-CO')} COP
                            </p>
                            <hr style="border: none; border-top: 1px solid #333; margin: 10px 0;">
                        `;
                    }).join('');

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: compra.correo, // Usar el correo proporcionado en la compra
                        subject: '¡Tu compra en hardcodecol.com ha sido confirmada!',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #000; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                                <div style="background-color: rgb(146, 0, 0); padding: 25px; text-align: center;">
                                    <h1 style="color: #fff; margin: 0; font-size: 28px;">¡Compra Confirmada!</h1>
                                </div>
                                <div style="padding: 30px; color: #fff;">
                                    <p style="font-size: 16px; line-height: 1.6;">Hola <strong style="color: rgb(146, 0, 0);">${compra.nombres || ''} ${compra.apellidos || ''}</strong>,</p>
                                    <p style="font-size: 16px; line-height: 1.6;">¡Gracias por tu compra en hardcodecol.com! Tu transacción ha sido procesada exitosamente.</p>
                                    <p style="font-size: 18px; font-weight: bold; color: rgb(146, 0, 0);">Detalles de tu compra:</p>
                                    <p style="font-size: 16px; margin-bottom: 5px;"><strong>ID de Compra:</strong> ${compra.id}</p>
                                    <p style="font-size: 16px; margin-bottom: 5px;"><strong>Fecha de Pago:</strong> ${new Date(compra.fecha_pago).toLocaleString('es-CO')}</p>
                                    <p style="font-size: 16px; margin-bottom: 5px;"><strong>Método de Pago:</strong> ${payment.payment_type_id}</p>
                                    <p style="background-color: #222; color: rgb(146, 0, 0); padding: 15px; text-align: center; font-size: 20px; font-weight: bold; margin: 25px 0;">
                                        Monto Total Pagado: $${compra.precio_total.toLocaleString('es-CO')} COP
                                    </p>
                                    <p style="font-size: 18px; font-weight: bold; color: rgb(146, 0, 0); margin-top: 25px;">Tickets Incluidos:</p>
                                    <div style="background-color: #222; padding: 15px;">
                                        ${itemsHtml}
                                    </div>
                                    <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Puedes ver tus tickets y el estado de tu compra en tu panel de usuario en nuestra página web.</p>
                                    <p style="font-size: 16px; font-weight: bold; color: rgb(146, 0, 0);">hardcodecol.com</p>
                                </div>
                                <div style="background-color: #222; padding: 15px; text-align: center; font-size: 12px; color: #888;">
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
            // Validar campos obligatorios
            if (!item.etapaId || !item.tipoTicket) {
                console.error(`Item ${item.id} no tiene etapaId o tipoTicket válido`);
                continue;
            }

            // Obtener datos del evento (para el trigrama del QR)
            const etapa = await sequelize.models.Etapa.findByPk(item.etapaId, {
                include: [{
                    model: sequelize.models.Evento,
                    as: 'evento',
                    attributes: ['trigrama']
                }],
                transaction
            });

            if (!etapa || !etapa.evento) {
                throw new Error(`No se encontró evento para la etapa del item ${item.id}`);
            }

            // Determinar cuántos tickets crear según el tipo de ítem
            let cantidadTickets = item.cantidad;
            if (item.tipo === 'paquete') {
                cantidadTickets = item.cantidad * (item.ticketsPaquete || 1);
            }

            // Crear los tickets
            for (let i = 0; i < cantidadTickets; i++) {
                await ticketController.createTicket({
                    userId: compra.userId,
                    etapaId: item.etapaId,
                    tipo: item.tipoTicket,
                    compraId: compra.id,
                    carritoId: compra.carritoId,
                    paqueteId: item.paqueteId
                }, transaction);
            }
        }
    } catch (error) {
        console.error('Error al generar tickets:', error);
        throw error;
    }
};