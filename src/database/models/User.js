const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'El nombre de usuario es requerido'
        },
        len: {
          args: [3, 50],
          msg: 'El nombre de usuario debe tener entre 3 y 50 caracteres'
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Por favor proporciona un email válido'
        },
        notEmpty: {
          msg: 'El email es requerido'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La contraseña es requerida'
        },
        len: {
          args: [6, 100],
          msg: 'La contraseña debe tener al menos 6 caracteres'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'entry_control'),
      defaultValue: 'user',
      validate: {
        isIn: {
          args: [['user', 'admin', 'entry_control']],
          msg: 'Rol no válido'
        }
      }
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpire: DataTypes.DATE
  }, {
    timestamps: true,
    tableName: 'users',
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: (user) => {
        user.updatedAt = new Date();
      }
    }
  });

  // Método para comparar contraseñas
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Método para establecer relaciones (se llama desde models/index.js)
  User.associate = (models) => {
    // Relación con Tickets
    if (models.Ticket) {
      User.hasMany(models.Ticket, {
        foreignKey: 'userId',
        as: 'tickets'
      });
    }
    
    // Relación con Carrito (1:1)
    if (models.Carrito) {
      User.hasOne(models.Carrito, {
        foreignKey: 'userId',
        as: 'carrito',
        onDelete: 'CASCADE'
      });
    }
    
    // Relación con Compras
    if (models.Purchase) {
      User.hasMany(models.Purchase, {
        foreignKey: 'userId',
        as: 'purchases'
      });
    }

    // NEW: Many-to-many relationship with Evento through UserEvento
    if (models.Evento && models.UserEvento) {
      User.belongsToMany(models.Evento, {
        through: models.UserEvento,
        foreignKey: 'userId',
        otherKey: 'eventoId',
        as: 'eventos',
        onDelete: 'SET NULL', // If a user is deleted, set userId to NULL in UserEvento
        onUpdate: 'CASCADE',
      });
    }
  };

  return User;
};