const nodemailer = require('nodemailer');

// Configuración del transportador para Zoho Mail
const transporter = nodemailer.createTransport({
    host: "smtppro.zoho.com", // Nombre del servidor saliente de Zoho Mail
    port: 465, // Puerto para SSL
    secure: true, // Usa SSL/TLS
    auth: {
        user: process.env.EMAIL_USER, // (info@hardcodecol.com)
        pass: process.env.ZOHO_APP_PASSWORD,
    },
});

module.exports = transporter;