const path = require('path');
const { DataTypes } = require('sequelize');
const sequelize = require('../index'); // Instancia de sequelize

// Importar todos los modelos
const User = require('./User')(sequelize, DataTypes);
const Evento = require('./Evento')(sequelize, DataTypes);
const UserEvento = require('./UserEvento')(sequelize, DataTypes);
const Etapa = require('./Etapa')(sequelize, DataTypes);
const Ticket = require('./Ticket')(sequelize, DataTypes);
const Compra = require('./Compra')(sequelize, DataTypes);
const Paquete = require('./Paquete')(sequelize, DataTypes);
const Carrito = require('./Carrito')(sequelize, DataTypes);
const ItemCarrito = require('./ItemCarrito')(sequelize, DataTypes);
const CompraItem = require('./CompraItem')(sequelize, DataTypes);
const Banner = require('./Banner')(sequelize, DataTypes);

// Colección de modelos
const db = {
  sequelize,
  DataTypes,
  User,
  UserEvento,
  Evento,
  Etapa,
  Ticket,
  Compra,
  Paquete,
  Carrito,
  ItemCarrito,
  CompraItem,
  Banner
};

// Asociaciones
Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

module.exports = db;