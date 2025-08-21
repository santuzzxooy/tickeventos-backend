const { Ticket, Evento, Etapa } = require('../database/models');
const transporter = require('../config/email');

exports.transferTicket = async (req, res) => {
    // let browser; // REMOVED: No longer needed with Puppeteer removal
    try {
        const { ticketId } = req.params;
        const {
            correo_transferido: emailDestinatario,
            mensajePersonalizado,
            cedulaDestinatario,
            nombreDestinatario,
            pdfBase64 // NEW: Receive the Base64 PDF from the frontend
        } = req.body;

        // Ensure ticketId is a number
        const ticketIdNum = parseInt(ticketId, 10);
        if (isNaN(ticketIdNum)) {
            return res.status(400).json({ message: 'ID de ticket inválido.' });
        }

        // Fetch the ticket and its associated event to get event details
        const ticket = await Ticket.findByPk(ticketIdNum, {
            include: [{
                model: Evento,
                as: 'evento'
            }, {
                model: Etapa,
                as: 'etapa'
            }]
        });

        if (!ticket) {
            return res.status(404).json({
                message: 'Ticket no encontrado.'
            });
        }

        // Validate ticket status: 'usado' is a boolean, check if it's false (not used)
        if (ticket.usado) {
            return res.status(400).json({
                message: 'Solo se pueden transferir tickets con estado "Disponible" (no usados).'
            });
        }

        // Validate if the ticket has already been transferred
        if (ticket.transferido) {
            return res.status(400).json({
                message: 'Este ticket ya ha sido transferido previamente.'
            });
        }

        if (!ticket.qrCode) {
            return res.status(400).json({
                message: 'El ticket no tiene un código QR asociado. No se puede transferir.'
            });
        }

        // Update ticket status to 'Transferido' and assign new owner
        ticket.transferido = true;
        ticket.fecha_transferido = new Date();
        ticket.nombre_transferido = nombreDestinatario;
        ticket.correo_transferido = emailDestinatario;
        ticket.cedula_transferido = cedulaDestinatario;

        await ticket.save();

        // No need to generate QR code here for the PDF as it comes from the frontend
        // No need to load logo or fonts here for the PDF

        const eventName = ticket.evento ? ticket.evento.nombre : 'Evento Desconocido';
        // const eventDate = ticket.evento ? new Date(ticket.evento.fecha).toLocaleDateString('es-ES') : 'Fecha Desconocida'; // Not used in email HTML directly
        // const eventLocation = ticket.evento ? ticket.evento.ubicacion : 'Ubicación Desconocida'; // Not used in email HTML directly
        // const ticketType = ticket.tipo; // Not used in email HTML directly
        // const ticketCode = ticket.id; // Not used in email HTML directly

        // --- INICIO DE MANEJO DE PDF DESDE EL CLIENTE ---
        // Decodifica el PDF Base64 recibido del frontend a un Buffer
        if (!pdfBase64 || !pdfBase64.startsWith('data:application/pdf;base64,')) {
            return res.status(400).json({ message: 'PDF adjunto inválido o faltante.' });
        }
        const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
        // --- FIN DE MANEJO DE PDF DESDE EL CLIENTE ---

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailDestinatario,
            subject: `¡Tu ticket para ${eventName} !`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: black; color: white; padding: 20px;">
                    <h1 style="color: #f3ad00; text-align: center; margin-bottom: 20px;">¡Te han transferido un ticket!</h1>
                    <div style="background-color: #333; padding: 20px; border: 1px solid #f3ad00;">
                        <p style="font-size: 16px; margin-bottom: 10px;">Hola <strong style="color: #f3ad00;">${nombreDestinatario}</strong>,</p>
                        <p style="font-size: 16px; margin-bottom: 10px;">¡Felicidades! Has recibido un ticket transferido para el evento <strong style="color: #f3ad00;">${eventName}</strong>.</p>
                        <p style="font-size: 16px; margin-bottom: 10px;">Adjunto encontrarás tu nuevo ticket en formato PDF.</p>
                        <p style="font-size: 16px; margin-bottom: 20px;">No compartas este archivo con nadie o podrías perder tu acceso.</p>
                        <p style="font-size: 16px; margin-bottom: 10px;"><strong style="color: #f3ad00;">Mensaje del remitente:</strong></p>
                        <p style="font-size: 16px; margin-bottom: 20px;">${mensajePersonalizado || 'No se dejó un mensaje personalizado.'}</p>
                        <p style="font-size: 16px; margin-bottom: 10px;">¡Esperamos que disfrutes del evento!</p>
                        <p style="font-size: 16px;">Saludos,</p>
                        <p style="font-size: 16px; color: #f3ad00;">El equipo de hardcodecol.com</p>
                    </div>
                    <p style="text-align: center; font-size: 12px; color: #888; margin-top: 20px;">Este correo ha sido enviado automáticamente. Por favor, no respondas.</p>
                </div>
            `,
            attachments: [{
                filename: `ticket-${ticket.id}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }],
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            message: 'Ticket transferido y correo enviado exitosamente.'
        });

    } catch (error) {
        console.error('Error al transferir ticket o enviar correo:', error);
        let errorMessage = 'Error al transferir ticket o enviar correo.';
        if (error.message.includes('Failed to convert image to base64')) {
            errorMessage = `Error al cargar el logo: ${error.message}`;
        } else if (error.message.includes('Failed to convert font file')) {
            errorMessage = `Error al cargar la fuente: ${error.message}`;
        } else if (error.message.includes("Could not find Chrome") || error.message.includes("Failed to launch the browser process")) {
            // This error might still appear if Puppeteer dependencies are present but not used/configured correctly
            errorMessage = `Error de configuración de PDF: Asegúrate de que Puppeteer y sus dependencias (Chromium) están instalados correctamente en el entorno de servidor. Consulta el Dockerfile.`;
        } else if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            errorMessage = `Error de validación de base de datos: ${error.message}`;
        } else if (error.code === 'EENVELOPE' || error.code === 'EAUTH') {
            errorMessage = `Error al enviar el correo: Verifique la configuración del servidor de correo o las credenciales (EMAIL_USER, GOOGLE_APP_PASSWORD).`;
        } else if (error.message.includes('PDF adjunto inválido')) {
            errorMessage = error.message; // Use the specific message for invalid PDF
        }

        res.status(500).json({
            message: errorMessage,
            error: error.message
        });
    } finally {

    }
};