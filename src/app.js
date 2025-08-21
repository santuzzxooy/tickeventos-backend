process.env.TZ = "America/Bogota";
require("dotenv").config();
require("./cron");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sequelize } = require("./database/models");
const app = express();

app.set("trust proxy", true);
const rateLimiter = require("./middlewares/rateLimiter");

app.use(express.json({ limit: "50mb" }));

// Parsear la variable de entorno FRONTEND_URL en un array de orígenes permitidos
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como de Postman, curl, etc.)
    if (!origin) return callback(null, true);
    // Verificar si el origen de la solicitud está en nuestra lista de orígenes permitidos
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Es útil loguear el origen no permitido en producción para depurar
      console.error(`CORS: Origen no permitido -> ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true, // Esto es crucial para que las cookies sean enviadas
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Para manejar cookies
const cookieParser = require("cookie-parser");

// Middleware
app.use(express.json()); // Debe ir antes de las rutas para parsear el body
app.use(cookieParser()); // Para manejar cookies, también debe ir temprano
app.use(cors(corsOptions)); // Aplicamos las opciones de CORS lo antes posible para tus rutas API
app.use(rateLimiter); // RateLimiter después de los parsers para proteger tus API

// Sirve archivos estáticos (ej. tu frontend si lo sirves desde el mismo backend)
app.use(express.static(path.join(__dirname, "public")));

// Configuración de la base de datos
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a PostgreSQL establecida");

    const [result] = await sequelize.query(
      "SELECT current_setting('TIMEZONE') as timezone"
    );
    console.log(
      "⏰ Zona horaria de PostgreSQL:",
      result[0]?.timezone || "No detectada"
    );

    // Sync forzado solo en primera ejecución
    await sequelize.sync({ alter: true }); // <-- Esto en producción
    console.log("🗃️️ Modelos sincronizados (alter)");
  } catch (error) {
    console.error("❌ Error de base de datos:", error);
    process.exit(1);
  }
};

// Rutas
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/usereventos", require("./routes/userEventoRoutes"));
app.use("/api/eventos", require("./routes/eventoRoutes"));
app.use("/api/banners", require("./routes/bannerRoutes"));
app.use("/api/etapas", require("./routes/etapaRoutes"));
app.use("/api/paquetes", require("./routes/paqueteRoutes"));
app.use("/api/palcos", require("./routes/palcoRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/carrito", require("./routes/carritoRoutes"));
app.use("/api/compras", require("./routes/compraRoutes"));
app.use("/api/pagos", require("./routes/pagosRoutes"));
app.use("/api/estadisticas", require("./routes/estadisticaRoutes"));

// Ruta de salud
app.use("/api", require("./routes/healthRoutes"));

// Ruta de prueba (sirve tu index.html si no es una SPA externa)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    // Para rutas de API no encontradas, mantener comportamiento original (404)
    return res
      .status(404)
      .json({ success: false, message: "Ruta de API no encontrada" });
  }
  // Para cualquier otra ruta que no sea API, servir el index.html (útil para SPAs)
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.stack); // Esto es crucial para ver los errores en los logs de Railway
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "development" ? err.message : "Error interno",
  });
});

// Inicialización
const startServer = async () => {
  await initializeDatabase();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || "development"}`);
  });
};

startServer();
