const { DataTypes } = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize) => {
  const Evento = sequelize.define('Evento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trigrama: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue('trigrama', value ? value.toUpperCase() : null);
      },
    },
    subtitulo: {
      type: DataTypes.STRING,
    },
    descripcion: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false
    },
    imagen: {
      type: DataTypes.TEXT,
    },
    imagen_c: {
      type: DataTypes.TEXT,
    },
    imagen_post: {
      type: DataTypes.TEXT,
    },
    rango_precios: {
      type: DataTypes.STRING,
    },
    es_gratis: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ubicacion: {
      type: DataTypes.TEXT,
      allowNull: false,
      // Removed encryption logic from set method
      set(value) {
        this.setDataValue('ubicacion', value);
      },
      get() {
        const rawValue = this.getDataValue('ubicacion');
        // Removed decryption logic from get method
        return rawValue;
      }
    },
    ubicacion_maps: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    mostrar_ubicacion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mostrar_ubicacion_sincomprar: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    fecha_ubicacion: {
      type: DataTypes.DATE,
    },
    fecha_ubicacion_text: {
      type: DataTypes.STRING,
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    limite_tickets: {
      type: DataTypes.INTEGER,
    },
    categoria: {
      type: DataTypes.STRING,
    },
    organizador: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    info_contacto: {
      type: DataTypes.STRING,
      allowNull: false,
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
      type: DataTypes.ENUM('borrador', 'publicado', 'cancelado', 'finalizado'),
      defaultValue: 'borrador',
    },
    edad_minima: {
      type: DataTypes.INTEGER,
    },
    destacado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    hooks: {
      beforeValidate: (evento) => {
        if (evento.mostrar_ubicacion === false && !evento.fecha_ubicacion) {
          throw new Error('fecha_ubicacion es requerida cuando mostrar_ubicacion es false');
        }
      },
      beforeCreate: (evento) => {
        evento.slug = slugify(evento.nombre, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g,
        });

        // Removed encryption logic for ubicacion
      },
      beforeUpdate: (evento) => {
        if (evento.changed('nombre')) {
          evento.slug = slugify(evento.nombre, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        }

        // Manejar cambios en mostrar_ubicacion
        if (evento.changed('mostrar_ubicacion') && evento.mostrar_ubicacion === false && !evento.fecha_ubicacion) {
          throw new Error('fecha_ubicacion es requerida cuando mostrar_ubicacion es false');
        }

        // Removed decryption logic for ubicacion when mostrar_ubicacion changes to true
      }
    },
    tableName: 'eventos',
    underscored: true,
  });

  Evento.associate = (models) => {
    Evento.hasMany(models.Etapa, {
      foreignKey: 'eventoId',
      as: 'etapas',
    });
    Evento.hasMany(models.Paquete, {
      foreignKey: 'eventoId',
      as: 'paquetes',
    });

    // NEW: Many-to-many relationship with User through UserEvento
    if (models.User && models.UserEvento) {
      Evento.belongsToMany(models.User, {
        through: models.UserEvento,
        foreignKey: 'eventoId',
        otherKey: 'userId',
        as: 'users',
        onDelete: 'SET NULL', // If an event is deleted, set eventoId to NULL in UserEvento
        onUpdate: 'CASCADE',
      });
    }
  };

  return Evento;
};