const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_CONTROL_SECRET = process.env.JWT_CONTROL_SECRET;

const authMiddleware = async (req, res, next) => {
  try {

    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'role'],
      include: [{
        association: 'carrito',
        attributes: ['id'],
        required: false
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      carritoId: user.carrito?.id
    };

    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

const authControlMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('authControlMiddleware: Token no proporcionado.'); // NUEVO
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña inválidos' // Mensaje genérico para no dar pistas.
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_CONTROL_SECRET);
    } catch (jwtError) {
      console.error('authControlMiddleware: Error al verificar JWT:', jwtError.message); // NUEVO
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado' // Este es el mensaje que recibes
      });
    }

    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'role'],
      include: [{
        association: 'carrito',
        attributes: ['id'],
        required: false
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña inválidos'
      });
    }

    const allowedRoles = ['admin', 'entry_control'];
    if (!allowedRoles.includes(user.role)) {
      console.log('authControlMiddleware: Rol no permitido para usuario:', user.username, 'Rol:', user.role); // NUEVO
      return res.status(403).json({
        success: false,
        error: 'Usuario no admitido'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      carritoId: user.carrito?.id
    };
    next();
  } catch (error) {
    console.error('authControlMiddleware: Error inesperado en el try/catch principal:', error.message); // NUEVO
    res.clearCookie('token');
    return res.status(401).json({
      success: false,
      error: 'Usuario o contraseña inválidos'
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acceso restringido a administradores'
    });
  }
  next();
};

const controlMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'entry_control') {
    return res.status(403).json({
      success: false,
      error: 'Acceso restringido a administradores y control de entrada'
    });
  }
  next();
};


module.exports = {
  authMiddleware,
  authControlMiddleware,
  adminMiddleware,
  controlMiddleware
};