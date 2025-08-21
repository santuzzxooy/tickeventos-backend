const syncDB = require('./sync');
const app = require('./app');
const { sequelize } = require('./database/models');

const start = async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      await syncDB();
    }

    const server = app.listen(3000, () => {
      console.log('Servidor listo en puerto 3000');
    });

    // Maneja el cierre del servidor de manera limpia.
    process.on('SIGTERM', async () => {
      console.log('SIGTERM recibido. Cerrando servidor y conexiones de DB...');
      server.close(async () => {
        console.log('Servidor Express cerrado.');
        await sequelize.close();
        console.log('Conexiones de la base de datos cerradas.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Fallo de inicio:', error);
    process.exit(1);
  }
};

start();