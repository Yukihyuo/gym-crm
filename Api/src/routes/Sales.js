import express from 'express';

import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import User from '../models/User.js';

const router = express.Router();

// Generar número de recibo único
const generateReceiptNumber = async () => {
  const lastSale = await Sale.findOne().sort({ createdAt: -1 });
  const lastNumber = lastSale ? parseInt(lastSale.receiptNumber.split('-')[1]) : 0;
  const newNumber = (lastNumber + 1).toString().padStart(6, '0');
  return `REC-${newNumber}`;
};

// POST - Crear una nueva venta
router.post('/create', async (req, res) => {
  try {
    const { clientId, items, payment, sellerId, totals } = req.body;

    // Validar que existan los datos requeridos
    if (!clientId || !items || !items.length || !payment || !sellerId) {
      return res.status(400).json({ 
        message: 'Faltan datos requeridos: clientId, items, payment, sellerId' 
      });
    }

    // Validar que el cliente y vendedor existan
    const [client, seller] = await Promise.all([
      User.findById(clientId),
      User.findById(sellerId)
    ]);

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    if (!seller) {
      return res.status(404).json({ message: 'Vendedor no encontrado' });
    }

    // Validar productos y stock
    const productsData = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({ 
          message: `Producto ${item.productId} no encontrado` 
        });
      }

      if (product.status !== 'available') {
        return res.status(400).json({ 
          message: `Producto ${product.name} no está disponible` 
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}` 
        });
      }

      productsData.push({
        product,
        quantity: item.quantity
      });
    }

    // Preparar items con precios actuales y calcular totales
    const saleItems = productsData.map(({ product, quantity }) => ({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      subtotal: product.price * quantity
    }));

    // Calcular totales
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = totals?.tax || 0;
    const discount = totals?.discount || 0;
    const total = subtotal + tax - discount;

    // Validar pago para método efectivo
    if (payment.method === 'cash') {
      if (!payment.amountPaid || payment.amountPaid < total) {
        return res.status(400).json({ 
          message: `Monto insuficiente. Total: $${total}, Pagado: $${payment.amountPaid || 0}` 
        });
      }
      payment.change = payment.amountPaid - total;
    }

    // Generar número de recibo
    const receiptNumber = await generateReceiptNumber();

    // Crear la venta
    const sale = new Sale({
      clientId,
      receiptNumber,
      items: saleItems,
      totals: {
        subtotal,
        tax,
        discount,
        total
      },
      payment,
      sellerId,
      status: 'completed'
    });

    await sale.save();

    // Reducir el stock de cada producto
    for (const { product, quantity } of productsData) {
      product.stock -= quantity;
      await product.save();
    }

    // Poblar la información del cliente y vendedor para la respuesta
    await sale.populate([
      { path: 'clientId', select: 'firstName lastName email' },
      { path: 'sellerId', select: 'firstName lastName' },
      { path: 'items.productId', select: 'name category' }
    ]);

    res.status(201).json({
      message: 'Venta creada exitosamente',
      sale
    });

  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ 
      message: 'Error al crear la venta',
      error: error.message 
    });
  }
});

// GET - Obtener todas las ventas
router.get('/getAll', async (req, res) => {
  try {
    const { status, sellerId, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Construir filtros
    const filters = {};
    if (status) filters.status = status;
    if (sellerId) filters.sellerId = sellerId;
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sales, total] = await Promise.all([
      Sale.find(filters)
        .populate('clientId', 'firstName lastName email')
        .populate('sellerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Sale.countDocuments(filters)
    ]);

    res.json({
      sales,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ 
      message: 'Error al obtener las ventas',
      error: error.message 
    });
  }
});

// GET - Obtener una venta específica
router.get('/getById/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('clientId', 'firstName lastName email phone')
      .populate('sellerId', 'firstName lastName')
      .populate('items.productId', 'name category');

    if (!sale) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    res.json(sale);

  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ 
      message: 'Error al obtener la venta',
      error: error.message 
    });
  }
});

// GET - Estadísticas de ventas
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate, sellerId } = req.query;

    const filters = { status: 'completed' };
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    if (sellerId) filters.sellerId = sellerId;

    const stats = await Sale.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totals.total' },
          totalTax: { $sum: '$totals.tax' },
          totalDiscount: { $sum: '$totals.discount' },
          averageTicket: { $avg: '$totals.total' }
        }
      }
    ]);

    // Ventas por método de pago
    const paymentMethods = await Sale.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$payment.method',
          count: { $sum: 1 },
          total: { $sum: '$totals.total' }
        }
      }
    ]);

    // Productos más vendidos
    const topProducts = await Sale.aggregate([
      { $match: filters },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      summary: stats[0] || {
        totalSales: 0,
        totalRevenue: 0,
        totalTax: 0,
        totalDiscount: 0,
        averageTicket: 0
      },
      paymentMethods,
      topProducts
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: error.message 
    });
  }
});

// PATCH - Cancelar/Reembolsar una venta
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({ 
        message: 'Estado inválido. Debe ser "cancelled" o "refunded"' 
      });
    }

    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    if (sale.status !== 'completed') {
      return res.status(400).json({ 
        message: 'Solo se pueden cancelar/reembolsar ventas completadas' 
      });
    }

    // Si es reembolso, devolver el stock
    if (status === 'refunded') {
      for (const item of sale.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    sale.status = status;
    if (reason) {
      sale.cancellationReason = reason;
    }
    await sale.save();

    res.json({
      message: `Venta ${status === 'cancelled' ? 'cancelada' : 'reembolsada'} exitosamente`,
      sale
    });

  } catch (error) {
    console.error('Error al actualizar estado de venta:', error);
    res.status(500).json({ 
      message: 'Error al actualizar la venta',
      error: error.message 
    });
  }
});

export default router;