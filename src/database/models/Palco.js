module.exports = (sequelize, DataTypes) => {
    const Palco = sequelize.define('Palco', {
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
        ubicacion: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: 'unique_palco_por_evento'
        },
        cantidadTickets: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        precio: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        disponible: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
    }, {
        tableName: 'palcos',
        underscored: true,
        timestamps: true,
        indexes: [{
            unique: true,
            fields: ['evento_Id', 'ubicacion']
        }]
    });

    Palco.associate = (models) => {
        Palco.belongsTo(models.Evento, { foreignKey: 'eventoId', as: 'evento' });
        Palco.belongsTo(models.Etapa, { foreignKey: 'etapaId', as: 'etapa' });
        Palco.hasMany(models.Ticket, { foreignKey: 'palcoId', as: 'tickets' });
    };

    return Palco;
};