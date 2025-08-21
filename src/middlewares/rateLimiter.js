const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: (req) => {
    if (req.user?.role === 'admin' || req.user?.role === 'entry_control') return Infinity;
    return req.user ? 35 : 25; // 35 peticiones/min (autenticados), 25 (anónimos)
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Límite alcanzado. Intenta nuevamente en 5 minutos.'
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip; // Prioridad IP real para no autenticados
  },
  skip: (req) => {
    const excludedRoutes = [
      '/api/users/me',
      '/api/carrito/',
      '/api/compras/',
      '/api/tickets/mis-tickets',

      // api de pagos excluida
      '/api/papgos/crear-preferencia',
      '/api/pagos/webhook'
    ];

    const isExcludedRoute = excludedRoutes.some(route =>
      req.path.startsWith(route)
    );

    return req.user?.role === 'admin'
      || req.user?.role === 'entry_control'
      || isExcludedRoute;
  }
});

module.exports = rateLimiter;