import express from 'express';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import { uploadProductImage } from '../middleware/productUpload.middleware.js';

const router = express.Router();

const validateStoreExists = async (storeId) => {
  if (!storeId) return false;
  const store = await Store.findById(storeId);
  return !!store;
};

// Normaliza el SKU: trim + mayúsculas; vacío/ausente pasa a null (retrocompatible)
const normalizeSku = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.toUpperCase() : null;
};

// Valida que el SKU no esté duplicado dentro de la misma sucursal
const ensureSkuAvailable = async (storeId, sku, excludeId = null) => {
  if (!sku) return;

  const filter = { storeId, sku };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await Product.findOne(filter);
  if (existing) {
    const error = new Error(`Ya existe un producto con el SKU "${sku}" en esta tienda`);
    error.statusCode = 400;
    throw error;
  }
};

// Convierte errores de índice único (E11000) en un 400 legible
const isDuplicateKeyError = (error) => error && error.code === 11000;




// Create - Crear un nuevo producto
router.post('/create', uploadProductImage.single('image'), async (req, res) => {
  try {
    const { storeId, name, price, stock, category, status, sku } = req.body;
    const parsedPrice = Number(price);
    const parsedStock = stock !== undefined ? Number(stock) : 0;
    const normalizedSku = normalizeSku(sku);

    // Validar campos requeridos
    if (!storeId || !name || price === undefined || !category || stock === undefined) {
      return res.status(400).json({
        message: 'ID de tienda, nombre, precio, stock y categoría son requeridos'
      });
    }

    const storeExists = await validateStoreExists(storeId);
    if (!storeExists) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    // Validar precio positivo
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: 'El precio no puede ser negativo'
      });
    }

    // Validar stock positivo
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        message: 'El stock no puede ser negativo'
      });
    }

    // Validar que el SKU no esté duplicado dentro de la sucursal
    await ensureSkuAvailable(storeId, normalizedSku);

    const imagePath = req.file ? `v1/uploads/products/${req.file.filename}` : null;

    // Crear el nuevo producto
    const newProduct = new Product({
      storeId,
      name,
      price: parsedPrice,
      stock: parsedStock,
      category,
      status: status || 'available',
      sku: normalizedSku,
      imageUrl: imagePath,
    });

    await newProduct.save();
    // console.log(newProduct)

    res.status(201).json({
      message: 'Producto creado exitosamente',
      product: newProduct
    });

  } catch (error) {
    console.error('Error en create:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        error: error.message
      });
    }

    if (isDuplicateKeyError(error)) {
      return res.status(400).json({
        message: 'Ya existe un producto con ese SKU en esta tienda',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Error al crear producto',
      error: error.message
    });
  }
});

// GetAll - Obtener todos los productos
router.get('/:storeId/getAll', async (req, res) => {
  try {
    const { storeId } = req.params;
    const storeExists = await validateStoreExists(storeId);
    if (!storeExists) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    const products = await Product.find({ storeId }).sort({ createdAt: -1 });

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

// GetById - Obtener un producto por ID dentro de una tienda
router.get('/:storeId/getById/:id', async (req, res) => {
  try {
    const { storeId, id } = req.params;

    const storeExists = await validateStoreExists(storeId);
    if (!storeExists) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    const product = await Product.findOne({ _id: id, storeId });

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

// Update - Actualizar un producto dentro de una tienda
router.put('/:storeId/update/:id', uploadProductImage.single('image'), async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const { name, price, stock, category, status, sku } = req.body;

    const parsedPrice = price !== undefined ? Number(price) : undefined;
    const parsedStock = stock !== undefined ? Number(stock) : undefined;
    const normalizedSku = normalizeSku(sku);

    const storeExists = await validateStoreExists(storeId);
    if (!storeExists) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    // Buscar el producto
    const product = await Product.findOne({ _id: id, storeId });

    if (!product) {
      return res.status(404).json({
        message: 'Producto no encontrado'
      });
    }

    // Validar precio si se proporciona
    if (price !== undefined && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      return res.status(400).json({
        message: 'El precio no puede ser negativo'
      });
    }

    // Validar stock si se proporciona
    if (stock !== undefined && (Number.isNaN(parsedStock) || parsedStock < 0)) {
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

    // Validar que el nuevo SKU no esté duplicado dentro de la sucursal
    if (sku !== undefined) {
      await ensureSkuAvailable(storeId, normalizedSku, id);
    }

    // Actualizar campos
    if (name !== undefined) product.name = name;
    if (parsedPrice !== undefined) product.price = parsedPrice;
    if (parsedStock !== undefined) product.stock = parsedStock;
    if (category !== undefined) product.category = category;
    if (status !== undefined) product.status = status;
    if (sku !== undefined) product.sku = normalizedSku;
    if (req.file) product.imageUrl = `v1/uploads/products/${req.file.filename}`;

    await product.save();

    res.status(200).json({
      message: 'Producto actualizado exitosamente',
      product: product
    });

  } catch (error) {
    console.error('Error en update:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        error: error.message
      });
    }

    if (isDuplicateKeyError(error)) {
      return res.status(400).json({
        message: 'Ya existe un producto con ese SKU en esta tienda',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
});

// Delete - Eliminar un producto dentro de una tienda
router.delete('/:storeId/delete/:id', async (req, res) => {
  try {
    const { storeId, id } = req.params;

    const storeExists = await validateStoreExists(storeId);
    if (!storeExists) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    const product = await Product.findOneAndDelete({ _id: id, storeId });

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

export const routeConfig = { path: "/v1/products", router }