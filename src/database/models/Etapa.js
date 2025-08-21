module.exports = (sequelize, DataTypes) => {
  const Etapa = sequelize.define('Etapa', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'eventos',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El nombre es requerido' },
        len: { args: [3, 255], msg: 'Debe tener entre 3 y 255 caracteres' }
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    inicio: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    fin: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    precios_por_tipo: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    disponibles_por_tipo: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    visibles_por_tipo: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'etapas',
    underscored: true
  });

  Etapa.associate = (models) => {
    // Relación con Evento
    Etapa.belongsTo(models.Evento, {
      foreignKey: 'eventoId',
      as: 'evento'
    });
    
    // Relación con Paquete
    Etapa.hasMany(models.Paquete, {
      foreignKey: 'etapaId',
      as: 'paquetes'
    });
  };

  return Etapa;
};