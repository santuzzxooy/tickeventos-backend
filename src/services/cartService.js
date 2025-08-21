const { Carrito, ItemCarrito, Etapa, Paquete } = require('../database/models');

class CartService {
    static async createUserCart(userId) {
        // Verificar primero si ya existe un carrito
        const existingCart = await Carrito.findOne({
            where: { user_id: userId }
        });

        if (existingCart) {
            return existingCart;
        }

        // Si no existe, crear uno nuevo
        return await Carrito.create({
            userId,
            estado: 'activo'
        });
    }

    static async getUserCart(userId) {
        let cart = await Carrito.findOne({
            where: { user_id: userId },
            include: [
                {
                    association: 'items',
                    include: [
                        'etapa',
                        'evento',
                        {
                            association: 'paquete',
                            required: false
                        }
                    ]
                }
            ],
            order: [['items', 'fecha_creacion', 'ASC']]
        });

        if (!cart) {
            cart = await this.createUserCart(userId);
        }

        // --- Inicio de la lógica de validación y eliminación optimizada ---
        if (cart && cart.items && cart.items.length > 0) {
            const now = new Date();

            // Obtener IDs de los ítems con etapas vencidas en una sola consulta
            const expiredItems = await ItemCarrito.findAll({
                where: {
                    carritoId: cart.id
                },
                include: [{
                    model: Etapa,
                    as: 'etapa',
                    where: {
                        fin: {
                            [require('sequelize').Op.lt]: now // Filtrar etapas donde 'fin' es menor que la fecha actual
                        }
                    },
                    required: true // Solo incluir ítems que tengan una etapa vencida
                }],
                attributes: ['id'] // Solo necesitamos los IDs de los ítems
            });

            const itemsToDeleteIds = expiredItems.map(item => item.id);

            if (itemsToDeleteIds.length > 0) {
                await ItemCarrito.destroy({
                    where: {
                        id: itemsToDeleteIds,
                        carritoId: cart.id
                    }
                });
                await cart.actualizarTotales();
                // Volver a cargar el carrito para reflejar los cambios
                cart = await Carrito.findOne({
                    where: { user_id: userId },
                    include: [
                        {
                            association: 'items',
                            include: [
                                'etapa',
                                'evento',
                                {
                                    association: 'paquete',
                                    required: false
                                }
                            ]
                        }
                    ],
                    order: [['items', 'fecha_creacion', 'ASC']]
                });
            }
        }
        // --- Fin de la lógica optimizada ---

        return cart;
    }

    static async addItemToCart({ userId, itemData }) {
        // Validar campos mínimos requeridos
        const requiredFields = ['tipo', 'etapaId', 'eventoId', 'carritoId'];
        const missingFields = requiredFields.filter(field => !itemData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
        }

        // Validaciones específicas por tipo
        if (itemData.tipo === 'ticket' && !itemData.tipoTicket) {
            throw new Error('tipoTicket es requerido para tickets');
        }

        if (itemData.tipo === 'paquete' && !itemData.paqueteId) {
            throw new Error('paqueteId es requerido para paquetes');
        }

        const cart = await this.getUserCart(userId);
        if (!cart) throw new Error('Carrito no encontrado');

        // Verificar que el carrito pertenece al usuario
        if (cart.userId !== userId) {
            throw new Error('No autorizado: el carrito no pertenece al usuario');
        }

        // Buscar si ya existe un ítem idéntico en el carrito
        const whereClause = {
            carritoId: cart.id,
            tipo: itemData.tipo,
            etapaId: itemData.etapaId,
            eventoId: itemData.eventoId,
            userId: userId
        };

        if (itemData.tipo === 'ticket') {
            whereClause.tipoTicket = itemData.tipoTicket;
        } else if (itemData.tipo === 'paquete') {
            whereClause.paqueteId = itemData.paqueteId;
        }

        const existingItem = await ItemCarrito.findOne({ where: whereClause });

        if (existingItem) {
            // Calcular nueva cantidad
            const nuevaCantidad = existingItem.cantidad + (itemData.cantidad || 1);

            // Obtener precio unitario según el tipo de item
            let precioUnitario;
            if (itemData.tipo === 'paquete') {
                const paquete = await Paquete.findByPk(itemData.paqueteId);
                if (!paquete) throw new Error('Paquete no encontrado');
                precioUnitario = paquete.precio;
            } else {
                const { precioValidado } = await this.obtenerPrecioYDisponibilidad({
                    tipo: 'ticket',
                    etapaId: itemData.etapaId,
                    tipoTicket: itemData.tipoTicket
                });
                precioUnitario = precioValidado;
            }

            // Preparar datos de actualización
            const updateData = {
                cantidad: nuevaCantidad,
                precio: precioUnitario * nuevaCantidad, // Correcto: precio unitario * cantidad
                ...(itemData.tipo === 'paquete' && {
                    totalTickets: nuevaCantidad * existingItem.ticketsPaquete
                })
            };


            // Actualizar solo los campos necesarios
            const updatedItem = await existingItem.update(updateData, {
                fields: ['cantidad', 'precio', 'totalTickets']
            });

            await cart.actualizarTotales();
            return updatedItem;
        }

        // Para nuevos items
        const cantidad = itemData.cantidad || 1;
        let precio;
        let totalTickets = cantidad;

        if (itemData.tipo === 'paquete') {
            const paquete = await Paquete.findByPk(itemData.paqueteId);
            if (!paquete) throw new Error('Paquete no encontrado');

            precio = paquete.precio * cantidad;
            totalTickets = cantidad * paquete.cantidadTickets;

            itemData = {
                ...itemData,
                ticketsPaquete: paquete.cantidadTickets,
                paquete_nombre: paquete.nombre,
                tipoTicket: paquete.tipoTicket
            };
        } else {
            const { precioValidado } = await this.obtenerPrecioYDisponibilidad(itemData);
            precio = precioValidado * cantidad;
        }

        const { disponible } = await this.obtenerPrecioYDisponibilidad(itemData);
        const newItem = await ItemCarrito.create({
            carritoId: cart.id,
            userId: userId,
            ...itemData,
            precio,
            totalTickets,
            disponible,
            cantidad
        });

        await cart.actualizarTotales();
        return newItem;
    }


    static async updateCartItem({ userId, itemId, newData }) {
        const cart = await this.getUserCart(userId);
        if (!cart) throw new Error('Carrito no encontrado');

        const item = await ItemCarrito.findOne({
            where: { id: itemId, carritoId: cart.id }
        });
        if (!item) throw new Error('Item no encontrado en el carrito');

        if (newData.cantidad || newData.tipoTicket) {
            const itemData = {
                tipo: item.tipo,
                paqueteId: item.paqueteId,
                tipoTicket: newData.tipoTicket || item.tipoTicket,
                etapaId: item.etapaId,
                eventoId: item.eventoId
            };

            const { precioValidado, disponible } = await this.obtenerPrecioYDisponibilidad(itemData);
            newData.precio = precioValidado * (newData.cantidad || item.cantidad);
            newData.disponible = disponible;

            if (item.tipo === 'paquete' && newData.cantidad) {
                newData.totalTickets = newData.cantidad * item.ticketsPaquete;
                // Si es paquete, mantener el tipo_ticket original del paquete
                const paquete = await Paquete.findByPk(item.paqueteId);
                if (paquete) {
                    newData.tipoTicket = paquete.tipo_ticket;
                }
            } else if (item.tipo === 'ticket' && newData.cantidad) {
                newData.totalTickets = newData.cantidad;
            }
        }

        const updatedItem = await item.update(newData);
        await cart.actualizarTotales();
        return updatedItem;
    }

    static async removeItemFromCart({ userId, itemId }) {
        const cart = await this.getUserCart(userId);
        if (!cart) throw new Error('Carrito no encontrado');

        const item = await ItemCarrito.findOne({
            where: { id: itemId, carritoId: cart.id }
        });
        if (!item) throw new Error('Item no encontrado en el carrito');

        await item.destroy();
        await cart.actualizarTotales();
        return await this.getUserCart(userId); // Devuelve el carrito actualizado
    }

    static async clearUserCart(userId) {
        const cart = await this.getUserCart(userId);
        if (cart) {
            await ItemCarrito.destroy({ where: { carritoId: cart.id } });
            await cart.actualizarTotales();
            return await this.getUserCart(userId); // Devuelve el carrito actualizado
        }
    }

    static async obtenerPrecioYDisponibilidad(itemData) {
        if (itemData.tipo === 'ticket') {
            const etapa = await Etapa.findByPk(itemData.etapaId);
            if (!etapa) throw new Error('Etapa no encontrada');

            const precioCorrecto = etapa.precios_por_tipo[itemData.tipoTicket];
            if (!precioCorrecto) throw new Error('Tipo de ticket no válido para esta etapa');

            const ahora = new Date();
            const finEtapa = new Date(etapa.fin);
            const disponible = ahora <= finEtapa && etapa.disponibles > 0;

            return { precioValidado: precioCorrecto, disponible };
        } else if (itemData.tipo === 'paquete') {
            const paquete = await Paquete.findByPk(itemData.paqueteId);
            if (!paquete) throw new Error('Paquete no encontrado');

            const etapa = await Etapa.findByPk(itemData.etapaId);
            let disponible = true;
            if (etapa) {
                const ahora = new Date();
                const finEtapa = new Date(etapa.fin);
                disponible = ahora <= finEtapa && etapa.disponibles > 0;
            }

            return { precioValidado: paquete.precio, disponible };
        }

        throw new Error('Tipo de item no válido');
    }
}

module.exports = CartService;