import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Create - Crear un nuevo producto
router.post('/create', async (req, res) => {
  try {
    const { name, description, price, stock, category, status } = req.body;

    // Validar campos requeridos
    if (!name || !description || price === undefined || !category) {
      return res.status(400).json({ 
        message: 'Nombre, descripción, precio y categoría son requeridos' 
      });
    }

    // Validar precio positivo
    if (price < 0) {
      return res.status(400).json({ 
        message: 'El precio no puede ser negativo' 
      });
    }

    // Validar stock positivo
    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ 
        message: 'El stock no puede ser negativo' 
      });
    }

    // Crear el nuevo producto
    const newProduct = new Product({
      name,
      description,
      price,
      stock: stock || 0,
      category,
      status: status || 'available'
    });

    await newProduct.save();

    res.status(201).json({ 
      message: 'Producto creado exitosamente',
      product: newProduct
    });

  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({ 
      message: 'Error al crear producto', 
      error: error.message 
    });
  }
});

// GetAll - Obtener todos los productos
router.get('/getAll', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Productos obtenidos exitosamente',
      count: products.length,
      products: products
    });

  } catch (error) {
    console.error('Error en getAll:', error);
    res.status(500).json({ 
      message: 'Error al obtener productos', 
      error: error.message 
    });
  }
});

// GetById - Obtener un producto por ID
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ 
        message: 'Producto no encontrado' 
      });
    }

    res.status(200).json({
      message: 'Producto obtenido exitosamente',
      product: product
    });

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({ 
      message: 'Error al obtener producto', 
      error: error.message 
    });
  }
});

// Update - Actualizar un producto
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, status } = req.body;

    // Buscar el producto
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ 
        message: 'Producto no encontrado' 
      });
    }

    // Validar precio si se proporciona
    if (price !== undefined && price < 0) {
      return res.status(400).json({ 
        message: 'El precio no puede ser negativo' 
      });
    }

    // Validar stock si se proporciona
    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ 
        message: 'El stock no puede ser negativo' 
      });
    }

    // Validar estado si se proporciona
    if (status !== undefined) {
      const validStatuses = ['available', 'unavailable', 'discontinued'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: 'Estado inválido. Debe ser: available, unavailable o discontinued' 
        });
      }
    }

    // Actualizar campos
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (category !== undefined) product.category = category;
    if (status !== undefined) product.status = status;

    await product.save();

    res.status(200).json({
      message: 'Producto actualizado exitosamente',
      product: product
    });

  } catch (error) {
    console.error('Error en update:', error);
    res.status(500).json({ 
      message: 'Error al actualizar producto', 
      error: error.message 
    });
  }
});

// Delete - Eliminar un producto
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    
    if (!product) {
      return res.status(404).json({ 
        message: 'Producto no encontrado' 
      });
    }

    res.status(200).json({
      message: 'Producto eliminado exitosamente',
      product: product
    });

  } catch (error) {
    console.error('Error en delete:', error);
    res.status(500).json({ 
      message: 'Error al eliminar producto', 
      error: error.message 
    });
  }
});

export default router;