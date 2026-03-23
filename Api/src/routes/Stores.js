import express from "express"
import Store from "../models/Store.js"

const router = express.Router()

// Create - Crear una nueva tienda
router.post('/create', async (req, res) => {
  try {
    const { brandId, name, code, description, email, phone, address, isActive } = req.body;

    // Validar campos requeridos
    if (!brandId || !name) {
      return res.status(400).json({
        message: 'El ID de marca y el nombre de la tienda son requeridos'
      });
    }

    // Crear la nueva tienda
    const newStore = new Store({
      brandId,
      name,
      code,
      description,
      email,
      phone,
      address,
      isActive
    });

    await newStore.save();

    res.status(201).json({
      message: 'Tienda creada exitosamente',
      store: newStore
    });

  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({
      message: 'Error al crear tienda',
      error: error.message
    });
  }
});

// GetAll - Obtener todas las tiendas
router.get('/getAll', async (req, res) => {
  try {
    const brandId = req.headers['x-brand-id'];
    const stores = await Store.find({ brandId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Tiendas obtenidas exitosamente',
      count: stores.length,
      stores: stores
    });

  } catch (error) {
    console.error('Error en getAll:', error);
    res.status(500).json({
      message: 'Error al obtener tiendas',
      error: error.message
    });
  }
});

// GetByBrandId - Obtener tiendas por ID de marca
router.get('/brand/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;

    const stores = await Store.find({ brandId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Tiendas obtenidas exitosamente',
      count: stores.length,
      stores: stores
    });

  } catch (error) {
    console.error('Error en getByBrandId:', error);
    res.status(500).json({
      message: 'Error al obtener tiendas',
      error: error.message
    });
  }
});

// GetById - Obtener una tienda por ID
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    res.status(200).json({
      message: 'Tienda obtenida exitosamente',
      store: store
    });

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({
      message: 'Error al obtener tienda',
      error: error.message
    });
  }
});

// Update - Actualizar una tienda
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, email, phone, address, isActive } = req.body;

    // Buscar la tienda
    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    // Actualizar campos
    if (name !== undefined) store.name = name;
    if (code !== undefined) store.code = code;
    if (description !== undefined) store.description = description;
    if (email !== undefined) store.email = email;
    if (phone !== undefined) store.phone = phone;
    if (address !== undefined) store.address = address;
    if (isActive !== undefined) store.isActive = isActive;

    await store.save();

    res.status(200).json({
      message: 'Tienda actualizada exitosamente',
      store: store
    });

  } catch (error) {
    console.error('Error en update:', error);
    res.status(500).json({
      message: 'Error al actualizar tienda',
      error: error.message
    });
  }
});

// Delete - Eliminar una tienda
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findByIdAndDelete(id);

    if (!store) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    res.status(200).json({
      message: 'Tienda eliminada exitosamente',
      store: store
    });

  } catch (error) {
    console.error('Error en delete:', error);
    res.status(500).json({
      message: 'Error al eliminar tienda',
      error: error.message
    });
  }
});

export const routeConfig = { path: "/v1/stores", router }