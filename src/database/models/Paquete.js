module.exports = (sequelize, DataTypes) => {
    const Paquete = sequelize.define('Paquete', {
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
            allowNull: false
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        cantidadTickets: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1 }
        },
        tipoTicket: {
            type: DataTypes.STRING,
            allowNull: false
        },
        visible: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        descuento: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: { min: 0, max: 1 }
        },
        precio: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        disponible: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        carritoId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        compraId: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'paquetes',
        underscored: true,
        timestamps: true
    });

    Paquete.associate = (models) => {
        Paquete.belongsTo(models.Evento, { foreignKey: 'eventoId', as: 'evento' });
        Paquete.belongsTo(models.Etapa, { foreignKey: 'etapaId', as: 'etapa' });
        Paquete.belongsTo(models.Carrito, { foreignKey: 'carritoId', as: 'carrito' });
        Paquete.belongsTo(models.Compra, { foreignKey: 'compraId', as: 'compra' });
        Paquete.hasMany(models.Ticket, { foreignKey: 'paqueteId', as: 'tickets' });
    };

    return Paquete;
};