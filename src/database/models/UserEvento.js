module.exports = (sequelize, DataTypes) => {
  const UserEvento = sequelize.define('UserEvento', {
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      primaryKey: true,
    },
    eventoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'eventos',
        key: 'id',
      },
      primaryKey: true,
    },
  }, {
    tableName: 'user_eventos',
    timestamps: false,
  });

  UserEvento.associate = (models) => {
    UserEvento.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    UserEvento.belongsTo(models.Evento, { foreignKey: 'eventoId', as: 'evento' });
  };

  return UserEvento;
};