module.exports = (sequelize, DataTypes) => {
    const Ticket = sequelize.define('Ticket', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      eventoId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      etapaId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      compraId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      carritoId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      paqueteId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      tipo: {
        type: DataTypes.STRING,
        allowNull: false
      },
      usado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      transferido: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      fecha_transferido: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      nombre_transferido: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      correo_transferido: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cedula_transferido: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      qrCode: {
        type: DataTypes.STRING
      }
    }, {
      tableName: 'tickets',
      underscored: true,
      timestamps: true
    });
  
    Ticket.associate = (models) => {
      Ticket.belongsTo(models.User, { foreignKey: 'userId', as: 'usuario' });
      Ticket.belongsTo(models.Etapa, { foreignKey: 'etapaId', as: 'etapa' });
      Ticket.belongsTo(models.Evento, { foreignKey: 'eventoId', as: 'evento' });
      Ticket.belongsTo(models.Compra, { foreignKey: 'compraId', as: 'compra' });
      Ticket.belongsTo(models.Carrito, { foreignKey: 'carritoId', as: 'carrito' });
      Ticket.belongsTo(models.Paquete, { foreignKey: 'paqueteId', as: 'paquete' });
    };
  
    return Ticket;
};