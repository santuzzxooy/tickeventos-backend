const { Op } = require('sequelize');
const { User } = require('../database/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const CartService = require('../services/cartService');
const crypto = require('crypto'); // Para generar contraseñas aleatorias
const transporter = require('../config/email'); // Importa el transportador de correo

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_CONTROL_SECRET = process.env.JWT_CONTROL_SECRET;

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { username: username },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            const errors = {};
            if (existingUser.username === username) errors.username = 'El nombre de usuario ya está en uso';
            if (existingUser.email === email) errors.email = 'El correo electrónico ya está registrado';

            return res.status(400).json({
                success: false,
                error: 'Datos ya registrados',
                details: errors
            });
        }

        const user = await User.create({
            username,
            email,
            password,
            role: 'user'
        });

        // Crear carrito para el nuevo usuario
        await CartService.createUserCart(user.id);

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email y contraseña son requeridos'
            });
        }

        const user = await User.findOne({
            where: { email },
            attributes: { include: ['password'] },
            include: [{
                association: 'carrito',
                required: false
            }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Verificar y crear carrito si no existe
        if (!user.carrito) {
            user.carrito = await CartService.createUserCart(user.id);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Configurar cookie HttpOnly
        res.cookie('token', token, {
            httpOnly: true, // HttpOnly activado
            secure: process.env.NODE_ENV === 'production', // Solo enviar por HTTPS en producción
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 día
        });

        const userResponse = user.get();
        delete userResponse.password;

        res.json({
            success: true,
            data: {
                user: {
                    ...userResponse,
                    carritoId: user.carrito.id // Asegurar que siempre haya un carritoId
                },
                cart: user.carrito // Enviar también el carrito completo si es necesario
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error en el servidor'
        });
    }
};

const loginControlUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email y contraseña son requeridos'
            });
        }

        const user = await User.findOne({
            where: { email },
            attributes: { include: ['password'] },
            include: [{
                association: 'carrito',
                required: false
            }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // --- Validación de rol ---
        if (user.role !== 'admin' && user.role !== 'entry_control') {
            return res.status(403).json({
                success: false,
                error: 'Acceso no autorizado. Este usuario no tiene los permisos requeridos.'
            });
        }
        // --- Fin de validación de rol ---

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        if (!user.carrito) {
            user.carrito = await CartService.createUserCart(user.id);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_CONTROL_SECRET,
            { expiresIn: '4h' } // Token duration is 4 hours
        );

        const decodedToken = jwt.decode(token);

        const expiresAt = decodedToken.exp * 1000;

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 4 * 60 * 60 * 1000 // 4 hours
        });

        const userResponse = user.get();
        delete userResponse.password;

        res.json({
            success: true,
            data: {
                user: {
                    ...userResponse,
                    carritoId: user.carrito.id
                },
                cart: user.carrito,
                expiresAt: expiresAt
            }
        });
    } catch (error) {
        console.error('Error en loginControlUser:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error en el servidor'
        });
    }
};

const checkUsernameAvailability = async (req, res) => {
    try {
        const { username } = req.query;

        if (!username || username.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El username es requerido'
            });
        }

        if (username.length < 4) {
            return res.json({
                success: true,
                available: false,
                message: 'El username debe tener al menos 4 caracteres'
            });
        }

        const validChars = /^[a-zA-Z0-9_]+$/;
        if (!validChars.test(username)) {
            return res.json({
                success: true,
                available: false,
                message: 'No se permiten espacios, solo letras, números y guiones bajos'
            });
        }

        const exists = await User.findOne({ where: { username } });

        res.json({
            success: true,
            available: !exists,
            username: username
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al verificar disponibilidad'
        });
    }
};

// Función para generar una contraseña aleatoria
const generateRandomPassword = () => {
    // Genera una contraseña de 12 caracteres (6 bytes * 2 hex chars)
    // Incluye letras mayúsculas, minúsculas y números para mayor seguridad
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const bytes = crypto.randomBytes(12); // Aumentar a 12 bytes para asegurar al menos 12 caracteres de longitud
    for (let i = 0; i < bytes.length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
};

// Controlador para recuperar contraseña
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // 1. Verificar si el correo electrónico existe
        // Se utiliza User.findOne para obtener también el username del usuario
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Correo electrónico inexistente'
            });
        }

        // 2. Generar nueva contraseña
        const newPassword = generateRandomPassword();

        // 3. Actualizar la contraseña del usuario en la base de datos
        // La lógica de hashing de la contraseña está en el hook beforeSave del modelo User
        user.password = newPassword;
        await user.save();

        // 4. Enviar la nueva contraseña por correo electrónico con diseño mejorado
        const mailOptions = {
            from: process.env.EMAIL_USER, // Tu correo electrónico configurado
            to: user.email,
            subject: 'Recuperación de Contraseña - hardcodecol.com',
            html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #000; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                        <div style="background-color: rgb(146, 0, 0); padding: 25px; text-align: center;">
                            <h1 style="color: #fff; margin: 0; font-size: 28px;">Recuperación de Contraseña</h1>
                        </div>
                        <div style="padding: 30px; color: #fff;">
                            <p style="font-size: 16px; line-height: 1.6;">Hola <strong style="color: rgb(146, 0, 0);">${user.username}</strong>,</p>
                            <p style="font-size: 16px; line-height: 1.6;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Tu nueva contraseña es:</p>
                            <p style="background-color: #222; color: rgb(146, 0, 0); padding: 15px; text-align: center; font-size: 20px; font-weight: bold; margin: 25px 0;">
                                ${newPassword}
                            </p>
                            <p style="font-size: 16px; line-height: 1.6;">Por motivos de seguridad, te recomendamos que cambies esta contraseña por una que sea fácil de recordar para ti una once que accedas a tu cuenta. Puedes hacerlo desde el panel en la sección de perfil.</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Saludos cordiales,</p>
                            <p style="font-size: 16px; font-weight: bold; color: rgb(146, 0, 0);">hardcodecol.com</p>
                        </div>
                        <div style="background-color: #222; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                            Este es un correo electrónico generado automáticamente. Por favor, no lo respondas.
                        </div>
                    </div>
                `,
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Se ha enviado una nueva contraseña a tu correo electrónico.'
        });

    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error en el servidor al recuperar la contraseña'
        });
    }
};

const changePassword = async (req, res) => {

    try {

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            console.log('Error: Campos requeridos ausentes');
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 12) {
            console.log('Error: Nueva contraseña demasiado corta');
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 12 characters long'
            });
        }

        const user = await User.findByPk(userId, {
            attributes: { include: ['password'] }
        });
        console.log('Usuario encontrado en DB:', user ? 'Sí' : 'No');

        if (!user) {
            console.log('Error: Usuario no encontrado para el ID:', userId);
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        console.log('Coincidencia de contraseña actual:', isMatch);

        if (!isMatch) {
            console.log('Error: Contraseña actual inválida');
            return res.status(401).json({
                success: false,
                error: 'Invalid current password'
            });
        }

        user.password = newPassword; // El hook beforeSave debería hashear esto
        await user.save();
        console.log('Contraseña actualizada exitosamente en DB');

        res.clearCookie('token', {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });
        console.log('Cookie de token limpiada');

        res.json({
            success: true,
            message: 'Password changed successfully. Please log in again with your new password.'
        });
        console.log('Respuesta exitosa enviada');

    } catch (error) {
        console.error('Error CRÍTICO en changePassword:', error); // Log más detallado del error
        if (!res.headersSent) { // Asegura que no se intente enviar una respuesta si ya se enviaron los headers
            res.status(500).json({
                success: false,
                error: error.message || 'Error changing password'
            });
        }
    }
};


module.exports = {
    registerUser,
    loginUser,
    loginControlUser,
    checkUsernameAvailability,
    forgotPassword,
    changePassword
};