process.env.TZ = 'America/Bogota';
const cron = require('node-cron');
const { Evento, sequelize } = require('./database/models');
const { Op } = require('sequelize');

const finalizeExpiredEvents = async () => {
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();

        // Optimized: Batch update for finalized events
        const [affectedRows] = await Evento.update(
            { estado: 'finalizado' },
            {
                where: {
                    estado: 'publicado',
                    fecha_fin: { [Op.lt]: now }
                },
                transaction
            }
        );

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
    }
};

// Ejecutar una vez al día a la 1:00 AM
cron.schedule('0 1 * * *', finalizeExpiredEvents);