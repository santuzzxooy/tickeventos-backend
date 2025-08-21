const CartService = require('../services/cartService');
const { Carrito } = require('../database/models');

const validateCartState = async (cartId, userId) => {
    const cart = await Carrito.findOne({
        where: { id: cartId, user_id: userId }
    });

    if (!cart) throw new Error('Carrito no encontrado');
    if (cart.estado === 'procesando_pago') throw new Error('El carrito está en proceso de pago. No se puede modificar.');
    if (cart.estado === 'pagado') throw new Error('El carrito ya fue pagado. No se puede modificar.');

    return cart;
};

exports.getCart = async (req, res) => {
    try {
        const cart = await CartService.getUserCart(req.user.id);
        
        res.json({
            success: true,
            cart: cart || { items: [] }
        });
    } catch (error) {
        console.error('Error en getCart:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener el carrito'
        });
    }
};

exports.addItem = async (req, res) => {
    try {
        
        if (!req.user?.id) {
            console.log('❌ [Controller] Error: req.user.id es undefined');
            return res.status(401).json({
                success: false,
                error: "Usuario no autenticado"
            });
        }

        const { tipo, carritoId, palcoId } = req.body;

        await validateCartState(carritoId, req.user.id);

        const cart = await Carrito.findOne({
            where: { id: carritoId, user_id: req.user.id }
        });
        
        if (!cart) {
            return res.status(403).json({
                success: false,
                error: 'No autorizado o carrito no encontrado'
            });
        }
        
        // Pass palcoId to the service
        const item = await CartService.addItemToCart({
            userId: req.user.id,
            itemData: {
                ...req.body,
                userId: req.user.id,
                palcoId, // Explicitly pass palcoId
            }
        });

        res.status(201).json({
            success: true,
            message: 'Item agregado al carrito',
            item
        });
    } catch (error) {
        console.error('❌ [Controller] Error en addItem:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

exports.updateItem = async (req, res) => {
    try {
        const cart = await CartService.getUserCart(req.user.id);
        if (!cart) {
            throw new Error('Carrito no encontrado');
        }

        await validateCartState(cart.id, req.user.id);

        const updatedItem = await CartService.updateCartItem({
            userId: req.user.id,
            itemId: req.params.id,
            newData: req.body
        });
        
        res.json({
            success: true,
            message: 'Item actualizado exitosamente',
            item: updatedItem
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            error: error.message || 'Error al actualizar item'
        });
    }
};

exports.removeItem = async (req, res) => {
    try {
        const cart = await CartService.getUserCart(req.user.id);
        if (!cart) {
            throw new Error('Carrito no encontrado');
        }

        await validateCartState(cart.id, req.user.id);

        const updatedCart = await CartService.removeItemFromCart({
            userId: req.user.id,
            itemId: req.params.id
        });
        
        res.status(200).json({
            success: true,
            cart: updatedCart
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            error: error.message || 'Error al eliminar item'
        });
    }
};

exports.clearCart = async (req, res) => {
    try {
        const cart = await CartService.getUserCart(req.user.id);
        if (cart) {
            await validateCartState(cart.id, req.user.id);
        }

        const updatedCart = await CartService.clearUserCart(req.user.id);
        res.status(200).json({
            success: true,
            cart: updatedCart
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message || 'Error al vaciar carrito'
        });
    }
};