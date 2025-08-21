const { User } = require('../database/models');

const updateUser = async (req, res) => {
  try {
    const updates = req.body;
    
    delete updates.password;
    delete updates.role;
    delete updates.verified;

    const [affectedRows] = await User.update(updates, {
      where: { id: req.user.userId },
      individualHooks: true
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({
      where: { id: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


const getEntryControlUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role: 'entry_control'
      },
      attributes: ['id', 'username'] // Solo retorna id y username
    });

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron usuarios con el rol "entry_control"'
      });
    }

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error getting entry_control users:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios de control de entrada.'
    });
  }
};

// controlador para cambiar el rol de "entry_control" a "user"
const demoteEntryControlToUser = async (req, res) => {
  try {
    const { userId } = req.body; 

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'El ID de usuario es requerido.'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado.'
      });
    }

    if (user.role !== 'entry_control') {
      return res.status(400).json({
        success: false,
        error: 'El usuario debe tener el rol "entry_control" para ser degradado a "user".'
      });
    }

    user.role = 'user';
    await user.save();

    res.json({
      success: true,
      message: 'Rol de usuario actualizado a "user" correctamente.',
      data: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error demoting user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al degradar el usuario.'
    });
  }
};

module.exports = {
  updateUser,
  deleteUser,
  getEntryControlUsers,
  demoteEntryControlToUser,
};