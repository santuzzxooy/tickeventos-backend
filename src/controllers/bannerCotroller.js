const { Sequelize } = require('sequelize');
const { Banner } = require('../database/models');
const { ValidationError } = require('sequelize');

// Obtener todos los banners (admin)
const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll({
      order: [['orden', 'DESC']]
    });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener banners' });
  }
};

// getbanners
const getActiveBanners = async (req, res) => {
  try {
    const now = new Date();
    const banners = await Banner.findAll({
      where: {
        visible: true,
        estado: 'publicado',
        [Sequelize.Op.and]: [
          { fecha_inicio: { [Sequelize.Op.lte]: now } },
          { 
            fecha_fin: { 
              [Sequelize.Op.or]: [
                { [Sequelize.Op.gte]: now },
                null
              ]
            }
          }
        ]
      },
      order: [['orden', 'DESC']]
    });

    if (!banners || banners.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay banners activos en este momento'
      });
    }

    res.json({ 
      success: true, 
      data: banners,
      meta: {
        timezone: 'America/Bogota',
        current_time: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Error en getActiveBanners:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener banners',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Crear nuevo banner
const createBanner = async (req, res) => {
  try {
    const bannerData = req.body;
    console.log('Fecha recibida del frontend:', bannerData.fecha_inicio); // Debug

    // Ajustar fechas a UTC si vienen con offset de Bogotá
    if (bannerData.fecha_inicio) {
      bannerData.fecha_inicio = new Date(bannerData.fecha_inicio).toISOString();
    }
    if (bannerData.fecha_fin) {
      bannerData.fecha_fin = new Date(bannerData.fecha_fin).toISOString();
    }

    const newBanner = await Banner.create(bannerData);
    res.status(201).json({ success: true, data: newBanner });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
    } else {
      res.status(500).json({ success: false, error: 'Error al crear banner' });
    }
  }
};

// Actualizar banner
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByPk(id);
    
    if (!banner) {
      return res.status(404).json({ success: false, error: 'Banner no encontrado' });
    }
    
    await banner.update(req.body);
    res.json({ success: true, data: banner });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
    } else {
      res.status(500).json({ success: false, error: 'Error al actualizar banner' });
    }
  }
};

// Eliminar banner (soft delete)
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByPk(id);
    
    if (!banner) {
      return res.status(404).json({ success: false, error: 'Banner no encontrado' });
    }
    
    await banner.destroy();
    res.json({ success: true, message: 'Banner eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar banner' });
  }
};

module.exports = {
  getAllBanners,
  getActiveBanners,
  createBanner,
  updateBanner,
  deleteBanner
};