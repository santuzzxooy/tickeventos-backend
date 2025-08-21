const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    // Aseguramos la zona horaria en la conexión.
    useUTC: true,
    connectionString: process.env.DATABASE_URL + "?options=-c%20timezone%3D'America/Bogota'"
  },
  timezone: 'America/Bogota',
  define: {
    timestamps: false,
    underscored: true,
    timestampsWithTimezone: true
  },
  pool: {
    max: 20,
    min: 0,
    acquire: 30000, // 30 segundos
    idle: 10000,    // Cierra las conexiones después de 10 segundos.
  }
});

sequelize.authenticate()
  .then(() => console.log('✔️  Conexión a DB establecida'))
  .catch(error => console.error('❌ Error de conexión:', error));

module.exports = sequelize;