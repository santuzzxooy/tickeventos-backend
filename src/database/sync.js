const db = require('./models');

const syncDB = async () => {
  try {
    console.log('🔨 Creación de tablas forzada...');
    
    await db.sequelize.sync({
      force: true,
      logging: (sql) => console.log(`📢 SQL: ${sql}`) // Log detallado
    });

    // Verificación con raw query
    const tables = await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS prueba (id SERIAL);
      DROP TABLE prueba;
      SELECT * FROM pg_tables WHERE schemaname = 'public';
    `);
    
    console.log('✅ Tablas existentes:', tables[2].rows);
    
  } catch (error) {
    console.error('🔥 Error:', error.original.sql || error);
  }
};

module.exports = syncDB;