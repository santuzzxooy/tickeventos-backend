const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
    const Carrito = sequelize.define('Carrito', {
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
        estado: {
            type: DataTypes.ENUM('activo', 'abandonado', 'procesando_pago'),
            defaultValue: 'activo',
            validate: {
                isIn: {
                    args: [['activo', 'abandonado', 'procesando_pago']],
                    msg: 'Estado de carrito no válido'
                }
            }
        },
        total_tickets: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        subtotal: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        precio_servicio: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        total: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        fecha_vence_compra: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de vencimiento para compras en proceso'
        },
        enlace_compra: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Enlace de pago generado para esta compra'
        },
        hash_contenido: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: 'Hash del contenido para detectar cambios'
        }
    }, {
        tableName: 'carritos',
        underscored: true,
        timestamps: true,
        createdAt: 'fecha_creacion',
        updatedAt: 'fecha_actualizacion',
        indexes: [
            {
                fields: ['user_id'],
                name: 'idx_carrito_usuario'
            },
            {
                fields: ['estado'],
                name: 'idx_carrito_estado'
            }
        ],
    });

    Carrito.prototype.actualizarTotales = async function () {
        const items = await this.getItems();

        if (items.length === 0) {
            this.subtotal = 0;
            this.total_tickets = 0;
            this.precio_servicio = 0;
            this.total = 0;
            this.hash_contenido = null;
        } else {
            // Calcular subtotal sumando los precios de cada ítem (que ya incluyen cantidad)
            this.subtotal = items.reduce((sum, item) => sum + item.precio, 0);

            // Calcular total de tickets
            this.total_tickets = items.reduce((sum, item) => {
                return item.tipo === 'ticket' ?
                    sum + item.cantidad :
                    sum + (item.totalTickets || 0);
            }, 0);

            // Calcular precio_servicio
            const baseServicio = (this.subtotal * 0.035) + 950 + (this.subtotal * 0.015);
            this.precio_servicio = baseServicio + (baseServicio * 0.19);

            // Calcular total final
            this.total = this.subtotal + this.precio_servicio;

            // Generar hash
            const contenido = JSON.stringify(items.map(item => ({
                id: item.id,
                tipo: item.tipo,
                cantidad: item.cantidad,
                precio: item.precio
            })));
            this.hash_contenido = crypto.createHash('sha256').update(contenido).digest('hex');
        }

        await this.save();
        return {
            subtotal: this.subtotal,
            precio_servicio: this.precio_servicio,
            total: this.total,
            total_tickets: this.total_tickets
        };
    };

    Carrito.associate = (models) => {
        Carrito.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'usuario',
            onDelete: 'CASCADE'
        });

        Carrito.hasMany(models.ItemCarrito, {
            foreignKey: 'carritoId',
            as: 'items',
            onDelete: 'CASCADE'
        });
    };

    Carrito.prototype.calcularTotal = async function () {
        const items = await this.getItems();
        return items.reduce((total, item) => {
            return total + (item.precioOriginal * item.cantidad);
        }, 0);
    };

    Carrito.prototype.actualizarTotal = async function () {
        this.total_estimado = await this.calcularTotal();
        await this.save();
        return this.total_estimado;
    };

    return Carrito;
};