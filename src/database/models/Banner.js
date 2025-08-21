const { DataTypes } = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize) => {
  const Banner = sequelize.define('Banner', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imagen: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    imagen_movil: {
      type: DataTypes.TEXT,
      comment: 'Imagen alternativa para dispositivos móviles',
    },
    url: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true,
      },
      comment: 'URL a la que redirige el banner',
    },
    orden: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de visualización (mayor número = más prioritario)',
    },
    fecha_inicio: {
      type: DataTypes.DATE(6),
      comment: 'Fecha en que el banner comienza a mostrarse',
    },
    fecha_fin: {
      type: DataTypes.DATE(6),
      comment: 'Fecha en que el banner deja de mostrarse',
    },
    visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
    },
    estado: {
      type: DataTypes.ENUM('borrador', 'publicado', 'oculto', 'finalizado'),
      defaultValue: 'borrador',
    },
    // Campos personalizados para timestamps
    created_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.fn('NOW'),
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.fn('NOW'),
      allowNull: false
    }
  }, {
    hooks: {
      beforeValidate: (banner) => {
        if (banner.fecha_inicio && banner.fecha_fin && banner.fecha_inicio > banner.fecha_fin) {
          throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin');
        }
      },
      beforeCreate: (banner) => {
        banner.slug = slugify(banner.nombre, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g,
        });
      },
      beforeUpdate: (banner) => {
        if (banner.changed('nombre')) {
          banner.slug = slugify(banner.nombre, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        }
      }
    },
    tableName: 'banners',
    underscored: true,
    paranoid: true,
    timestamps: false, // Desactivamos los timestamps automáticos
    createdAt: false,  // No usar el campo createdAt automático
    updatedAt: false   // No usar el campo updatedAt automático
  });

  return Banner;
};