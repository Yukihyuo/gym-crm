import express from "express"
import Brand from "../models/Brand.js"
import { createFullBrandSetup } from "../utils/brand.utils.js"

const router = express.Router()

const getBrandIdFromRequest = (req) => req.params.id || req.headers['x-brand-id']




// Create - Crear una nueva marca
router.post('/create', async (req, res) => {
  try {
    const { name, description, logo, website, email, phone, isActive } = req.body;

    // Validar campo requerido
    if (!name) {
      return res.status(400).json({
        message: 'El nombre de la marca es requerido'
      });
    }

    // Crear la nueva marca
    const newBrand = new Brand({
      name,
      description,
      logo,
      website,
      email,
      phone,
      isActive
    });

    await newBrand.save();

    res.status(201).json({
      message: 'Marca creada exitosamente',
      brand: newBrand
    });

  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({
      message: 'Error al crear marca',
      error: error.message
    });
  }
});

// CreateFullBrand - Inicializar marca con tienda, rol super admin y usuario super admin
router.post('/createFullBrand', async (req, res) => {
  try {
    const result = await createFullBrandSetup(req.body)

    res.status(201).json({
      message: 'Marca inicializada exitosamente',
      data: result
    })

  } catch (error) {
    console.error('Error en createFullBrand:', error)

    const statusCode = error.statusCode || 500
    const message = error.statusCode
      ? error.message
      : 'Error al inicializar marca'

    res.status(statusCode).json({
      message,
      error: error.message
    })
  }
})

// GetAll - Obtener todas las marcas
router.get('/getAll', async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Marcas obtenidas exitosamente',
      count: brands.length,
      brands: brands
    });

  } catch (error) {
    console.error('Error en getAll:', error);
    res.status(500).json({
      message: 'Error al obtener marcas',
      error: error.message
    });
  }
});

// GetById - Obtener una marca por ID
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        message: 'Marca no encontrada'
      });
    }

    res.status(200).json({
      message: 'Marca obtenida exitosamente',
      brand: brand
    });

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({
      message: 'Error al obtener marca',
      error: error.message
    });
  }
});

// Update - Actualizar una marca
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo, website, email, phone, isActive } = req.body;

    // Buscar la marca
    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        message: 'Marca no encontrada'
      });
    }

    // Actualizar campos
    if (name !== undefined) brand.name = name;
    if (description !== undefined) brand.description = description;
    if (logo !== undefined) brand.logo = logo;
    if (website !== undefined) brand.website = website;
    if (email !== undefined) brand.email = email;
    if (phone !== undefined) brand.phone = phone;
    if (isActive !== undefined) brand.isActive = isActive;

    await brand.save();

    res.status(200).json({
      message: 'Marca actualizada exitosamente',
      brand: brand
    });

  } catch (error) {
    console.error('Error en update:', error);
    res.status(500).json({
      message: 'Error al actualizar marca',
      error: error.message
    });
  }
});

//Endpoint para actualizar solo la configuración de la marca
router.get('/config', async (req, res) => {
  try {
    const brandId = getBrandIdFromRequest(req)

    if (!brandId) {
      return res.status(400).json({
        message: 'El id de la marca es requerido'
      })
    }

    const brand = await Brand.findById(brandId).select('settings')

    if (!brand) {
      return res.status(404).json({
        message: 'Marca no encontrada'
      })
    }

    res.status(200).json({
      message: 'Configuración obtenida exitosamente',
      settings: brand.settings ?? {}
    })
  } catch (error) {
    console.error('Error en get config:', error)
    res.status(500).json({
      message: 'Error al obtener la configuración de la marca',
      error: error.message
    })
  }
})

router.put('/config', async (req, res) => {
  try {
    const brandId = getBrandIdFromRequest(req)

    if (!brandId) {
      return res.status(400).json({
        message: 'El id de la marca es requerido'
      })
    }

    const brand = await Brand.findById(brandId)

    if (!brand) {
      return res.status(404).json({
        message: 'Marca no encontrada'
      })
    }

    const incomingSettings = req.body?.settings ?? req.body ?? {}

    brand.settings = {
      ...(brand.settings ?? {}),
      ...incomingSettings,
    }

    await brand.save()

    res.status(200).json({
      message: 'Configuración actualizada exitosamente',
      settings: brand.settings ?? {}
    })
  } catch (error) {
    console.error('Error en update config:', error)
    res.status(500).json({
      message: 'Error al actualizar la configuración de la marca',
      error: error.message
    })
  }
})

// Delete - Eliminar una marca
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findByIdAndDelete(id);

    if (!brand) {
      return res.status(404).json({
        message: 'Marca no encontrada'
      });
    }

    res.status(200).json({
      message: 'Marca eliminada exitosamente',
      brand: brand
    });

  } catch (error) {
    console.error('Error en delete:', error);
    res.status(500).json({
      message: 'Error al eliminar marca',
      error: error.message
    });
  }
});

export const routeConfig = { path: "/v1/brands", router }