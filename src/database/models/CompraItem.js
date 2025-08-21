module.exports = (sequelize, DataTypes) => {
  const CompraItem = sequelize.define('CompraItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    compraId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo: DataTypes.STRING,
    etapaId: DataTypes.INTEGER,
    paqueteId: DataTypes.INTEGER,
    cantidad: DataTypes.INTEGER,
    precio: DataTypes.FLOAT,
    tipoTicket: DataTypes.STRING,
    ticketsPaquete: DataTypes.INTEGER,
    totalTickets: DataTypes.INTEGER,
    eventoId: DataTypes.INTEGER
  }, {
    tableName: 'compra_items',
    underscored: true,
    timestamps: false
  });

  CompraItem.associate = (models) => {
    CompraItem.belongsTo(models.Compra, {
      foreignKey: 'compraId',
      as: 'compra'
    });
    // ¡Nuevas asociaciones!
    CompraItem.belongsTo(models.Etapa, {
      foreignKey: 'etapaId',
      as: 'etapa'
    });
    CompraItem.belongsTo(models.Paquete, {
      foreignKey: 'paqueteId',
      as: 'paquete'
    });
    CompraItem.belongsTo(models.Evento, {
      foreignKey: 'eventoId',
      as: 'evento'
    });
  };

  return CompraItem;
};