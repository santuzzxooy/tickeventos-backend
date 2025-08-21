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
            allowNull: false
        },
        paqueteId: {
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
            type: DataTypes.ENUM('ticket', 'paquete', 'merch'),
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
        ticketsPaquete: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        totalTickets: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1,
            validate: {
                min: 1
            }
        },
        disponible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        eventoId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        precio: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        precio_unidad: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            get() {
                // Si no está seteado, calcularlo dinámicamente
                const rawValue = this.getDataValue('precio_unidad');
                if (rawValue !== 0) return rawValue;
                
                if (this.precio && this.cantidad) {
                    return this.precio / this.cantidad;
                }
                return 0;
            }
        },
        paquete_nombre: {
            type: DataTypes.STRING,
            allowNull: true
        },
    }, {
        tableName: 'items_carrito',
        underscored: true,
        timestamps: true,
        createdAt: 'fecha_creacion',
        updatedAt: 'fecha_actualizacion',
        indexes: [
            {
                fields: ['carrito_id'],
                name: 'idx_item_carrito'
            },
            {
                fields: ['tipo', 'paquete_id'],
                name: 'idx_item_tipo_producto'
            }
        ],
        hooks: {
            beforeValidate: async (item) => {
                // Solo manejar asignación de IDs y nombres, NO cálculos de precio
                if (!item.userId && item.carritoId) {
                    const carrito = await sequelize.models.Carrito.findByPk(item.carritoId);
                    if (carrito) {
                        item.userId = carrito.userId;
                    }
                }
                
                const { Etapa, Evento, Paquete } = sequelize.models;
                
                // Asignar nombres solamente
                const evento = await Evento.findByPk(item.eventoId);
                if (evento) item.titulo = evento.nombre;
        
                if (item.etapaId) {
                    const etapa = await Etapa.findByPk(item.etapaId);
                    if (etapa) {
                        item.subTitulo = etapa.nombre;
                        const ahora = new Date();
                        const finEtapa = new Date(etapa.fin);
                        item.disponible = ahora <= finEtapa && etapa.disponibles > 0;
                    }
                }
        
                if (item.tipo === 'paquete' && item.paqueteId) {
                    const paquete = await Paquete.findByPk(item.paqueteId);
                    if (paquete) {
                        item.paquete_nombre = paquete.nombre;
                        item.ticketsPaquete = paquete.cantidadTickets;
                        item.tipoTicket = paquete.tipoTicket;
                        // NO calcular precio aquí
                    }
                }
            },
            beforeSave: async (item) => {
                if (item.precio && item.cantidad) {
                    item.precio_unidad = item.precio / item.cantidad;
                }
            }
        }
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
    };

    return ItemCarrito;
};