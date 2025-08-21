module.exports = (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return next();
    } else {
      return res.status(403).json({ message: 'Acceso denegado: solo para administradores' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error de autorización' });
  }
};