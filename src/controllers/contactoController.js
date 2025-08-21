const transporter = require('../config/email');
require('dotenv').config();

const sendContactEmail = async (req, res) => {
  const {
    nombreApellido,
    correoElectronico,
    usuario,
    tipoConsulta,
    numeroTelefono,
    detalles,
  } = req.body;

  // Construct the email subject
  const subject = `${tipoConsulta} - Contacto`;

  // Construct the email body
  let emailBody = `
    <h1>Nueva Consulta de Contacto</h1>
    <p><strong>Tipo de Consulta:</strong> ${tipoConsulta}</p>
    <h2>Datos de Contacto:</h2>
    <ul>
      <li><strong>Correo Electrónico:</strong> ${correoElectronico}</li>
      <li><strong>Número de Teléfono:</strong> ${numeroTelefono}</li>
    </ul>
    <h2>Datos Personales:</h2>
    <ul>
      <li><strong>Nombre y Apellido:</strong> ${nombreApellido}</li>
      ${usuario ? `<li><strong>Usuario:</strong> ${usuario}</li>` : ''}
    </ul>
    <h2>Detalles de la Consulta:</h2>
    <p>${detalles}</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // Sender address (your Gmail)
      to: process.env.EMAIL_USER,   // Recipient address (your Gmail for self-email)
      subject: subject,
      html: emailBody,
    });

    console.log('Email sent successfully!');
    res.status(200).json({ message: 'Tu mensaje ha sido enviado. Te responderemos en un máximo de tres días hábiles.' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.' });
  }
};

module.exports = {
  sendContactEmail,
};