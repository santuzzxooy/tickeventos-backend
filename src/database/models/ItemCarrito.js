module.exports = (sequelize, DataTypes) => {
    const ItemCarrito = sequelize.define('ItemCarrito', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        etapaId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        paqueteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        palcoId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        titulo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        subTitulo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        carritoId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        tipo: {
            type: DataTypes.ENUM('ticket', 'paquete', 'merch', 'palco'),
            allowNull: false
        },
        tipoTicket: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        cantidad: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                min: 1
            }
        },
        precio: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: 0
            }
        },
        precioOriginal: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        fecha_creacion: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        disponible: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('disponible') !== false;
            }
        },
        ticketsPaquete: {
            type: DataTypes.VIRTUAL
        }
    }, {
        tableName: 'items_carrito',
        timestamps: true,
        underscored: true
    });

    ItemCarrito.associate = (models) => {
        ItemCarrito.belongsTo(models.Carrito, {
            foreignKey: 'carritoId',
            as: 'carrito'
        });
        ItemCarrito.belongsTo(models.Evento, {
            foreignKey: 'eventoId',
            as: 'evento'
        });
        ItemCarrito.belongsTo(models.Etapa, {
            foreignKey: 'etapaId',
            as: 'etapa'
        });
        ItemCarrito.belongsTo(models.Paquete, {
            foreignKey: 'paqueteId',
            as: 'paquete'
        });
        ItemCarrito.belongsTo(models.Palco, {
            foreignKey: 'palcoId',
            as: 'palco'
        });
    };

    return ItemCarrito;
};