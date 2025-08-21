module.exports = (sequelize, DataTypes) => {
  const Compra = sequelize.define('Compra', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    carritoId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'pagado', 'cancelado', 'fallido'),
      defaultValue: 'pendiente'
    },
    metodo_pago: {
      type: DataTypes.STRING,
      allowNull: false
    },
    precio_total: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    precio_servicio: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    total_tickets: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mercadoPagoId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fecha_pago: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    fecha_limite: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    nombres: {
      type: DataTypes.STRING,
      allowNull: true
    },
    apellidos: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cedula: {
      type: DataTypes.STRING,
      allowNull: true
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hash_contenido: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'compras',
    underscored: true,
    timestamps: true,
    createdAt: 'fecha_compra',
    updatedAt: false,
    freezeTableName: true,
    schema: 'public',
  });

  Compra.associate = (models) => {
    Compra.belongsTo(models.User, { foreignKey: 'userId', as: 'usuario' });
    Compra.belongsTo(models.Carrito, { foreignKey: 'carritoId', as: 'carrito' });
    Compra.hasMany(models.Ticket, { foreignKey: 'compraId', as: 'tickets' });
    Compra.hasMany(models.CompraItem, {
      foreignKey: 'compraId',
      as: 'items'
    });
  };

  return Compra;
};