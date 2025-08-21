const { Carrito, ItemCarrito, Etapa, Paquete, Palco } = require('../database/models');
const { Op } = require('sequelize');

class CartService {
    static async createUserCart(userId) {
        const existingCart = await Carrito.findOne({
            where: { user_id: userId }
        });

        if (existingCart) {
            return existingCart;
        }

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
                        },
                        {
                            association: 'palco',
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

        if (cart && cart.items && cart.items.length > 0) {
            const now = new Date();

            const expiredItems = await ItemCarrito.findAll({
                where: {
                    carritoId: cart.id
                },
                include: [{
                    model: Etapa,
                    as: 'etapa',
                    where: {
                        fin: {
                            [Op.lt]: now
                        }
                    },
                    required: true
                }],
                attributes: ['id']
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
                                },
                                {
                                    association: 'palco',
                                    required: false
                                }
                            ]
                        }
                    ],
                    order: [['items', 'fecha_creacion', 'ASC']]
                });
            }
        }
        return cart;
    }

    static async obtenerInformacionItem({ tipo, tipoTicket, etapaId, paqueteId, palcoId }) {
        if (tipo === 'ticket') {
            const etapa = await Etapa.findByPk(etapaId);
            if (!etapa) throw new Error('Etapa no encontrada');

            const precioCorrecto = etapa.precios_por_tipo[tipoTicket];
            if (!precioCorrecto) throw new Error('Tipo de ticket no válido para esta etapa');

            const ahora = new Date();
            const finEtapa = new Date(etapa.fin);
            const disponible = ahora <= finEtapa && etapa.disponibles > 0;

            return {
                precio: precioCorrecto,
                disponible,
                titulo: `Ticket ${tipoTicket}`,
                subTitulo: etapa.nombre
            };
        } else if (tipo === 'paquete') {
            const paquete = await Paquete.findByPk(paqueteId);
            if (!paquete) throw new Error('Paquete no encontrado');

            const etapa = await Etapa.findByPk(paquete.etapaId);
            const ahora = new Date();
            let disponible = true;
            if (etapa) {
                const finEtapa = new Date(etapa.fin);
                disponible = ahora <= finEtapa && etapa.disponibles > 0;
            }

            return {
                precio: paquete.precio,
                disponible,
                cantidadTickets: paquete.cantidadTickets,
                titulo: paquete.nombre,
                subTitulo: `Incluye ${paquete.cantidadTickets} tickets`
            };
        } else if (tipo === 'palco') {
            const palco = await Palco.findByPk(palcoId);
            if (!palco) throw new Error('Palco no encontrado');

            // Lógica para verificar si el palco está disponible (puedes agregar más validaciones)
            const disponible = palco.disponible;

            return {
                precio: palco.precio,
                disponible,
                cantidadTickets: palco.cantidadTickets,
                titulo: palco.nombre,
                subTitulo: `Ubicación ${palco.ubicacion} - ${palco.cantidadTickets} tickets`
            };
        }

        throw new Error('Tipo de item no válido');
    }

    static async addItemToCart({ userId, itemData }) {
        const requiredFields = ['tipo', 'eventoId', 'carritoId'];
        if (itemData.tipo === 'ticket') requiredFields.push('etapaId', 'tipoTicket');
        if (itemData.tipo === 'paquete') requiredFields.push('paqueteId');
        if (itemData.tipo === 'palco') requiredFields.push('palcoId');

        const missingFields = requiredFields.filter(field => !itemData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
        }

        const cart = await this.getUserCart(userId);
        if (!cart) throw new Error('Carrito no encontrado');

        if (cart.userId !== userId) {
            throw new Error('No autorizado: el carrito no pertenece al usuario');
        }

        const cantidad = itemData.cantidad || 1;
        const { precio, disponible, titulo, subTitulo, cantidadTickets } = await this.obtenerInformacionItem(itemData);

        const newItemData = {
            carritoId: cart.id,
            userId: userId,
            ...itemData,
            cantidad,
            precio: precio * cantidad,
            precioOriginal: precio,
            disponible,
            totalTickets: cantidadTickets ? cantidad * cantidadTickets : cantidad,
            titulo,
            subTitulo
        };
        
        // Buscar si ya existe un ítem idéntico en el carrito para evitar duplicados
        const whereClause = {
            carritoId: cart.id,
            tipo: itemData.tipo,
            eventoId: itemData.eventoId,
            userId: userId,
        };

        if (itemData.tipo === 'ticket') whereClause.tipoTicket = itemData.tipoTicket;
        if (itemData.tipo === 'paquete') whereClause.paqueteId = itemData.paqueteId;
        if (itemData.tipo === 'palco') whereClause.palcoId = itemData.palcoId;

        const existingItem = await ItemCarrito.findOne({ where: whereClause });

        if (existingItem) {
            const nuevaCantidad = existingItem.cantidad + cantidad;
            await existingItem.update({
                cantidad: nuevaCantidad,
                precio: precio * nuevaCantidad,
                totalTickets: cantidadTickets ? nuevaCantidad * cantidadTickets : nuevaCantidad
            });
            await cart.actualizarTotales();
            return existingItem;
        }

        const newItem = await ItemCarrito.create(newItemData);
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
        
        if (newData.cantidad) {
            const itemData = {
                tipo: item.tipo,
                tipoTicket: item.tipoTicket,
                etapaId: item.etapaId,
                paqueteId: item.paqueteId,
                palcoId: item.palcoId
            };

            const { precio, disponible, cantidadTickets } = await this.obtenerInformacionItem(itemData);
            
            const updateData = {
                cantidad: newData.cantidad,
                precio: precio * newData.cantidad,
                disponible,
            };
            
            if (item.tipo === 'palco' || item.tipo === 'paquete') {
                updateData.totalTickets = newData.cantidad * cantidadTickets;
            } else {
                updateData.totalTickets = newData.cantidad;
            }

            await item.update(updateData);
        }
        
        await cart.actualizarTotales();
        return item;
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
        return await this.getUserCart(userId);
    }

    static async clearUserCart(userId) {
        const cart = await this.getUserCart(userId);
        if (cart) {
            await ItemCarrito.destroy({ where: { carritoId: cart.id } });
            await cart.actualizarTotales();
            return await this.getUserCart(userId);
        }
    }
}

module.exports = CartService;