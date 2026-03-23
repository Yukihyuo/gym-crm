import express from 'express';

import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Staff from '../models/Staff.js';
import Store from '../models/Store.js';
import Client from '../models/Client.js';
import { updateCashCutWithDocument } from './CashCuts.js';

const router = express.Router();

const validateStoreExists = async (storeId) => {
  if (!storeId) return null;
  return Store.findById(storeId);
};

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
    const { storeId, clientId, items, payment, userId, totals } = req.body;

    // Validar que existan los datos requeridos
    if (!storeId || !items || !items.length || !payment || !userId) {
      return res.status(400).json({
        message: 'Faltan datos requeridos: storeId, items, payment, userId'
      });
    }

    const store = await validateStoreExists(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    // Validar que el usuario vendedor exista
    const seller = await Staff.findById(userId);

    if (!seller) {
      return res.status(404).json({ message: 'Vendedor no encontrado' });
    }

    if (clientId) {
      const client = await Client.findById(clientId);

      if (!client) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }

      if (client.brandId !== store.brandId) {
        return res.status(400).json({ message: 'El cliente no pertenece a la marca de la tienda activa' });
      }
    }

    // Validar productos y stock
    const productsData = [];
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          message: 'Cada item debe incluir productId y quantity mayor a 0'
        });
      }

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

      if (product.storeId !== storeId) {
        return res.status(400).json({
          message: `El producto ${product.name} no pertenece a la tienda activa`
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
      storeId: storeId,
      userId,
      clientId: clientId || null,
      receiptNumber,
      items: saleItems,
      totals: {
        subtotal,
        tax,
        discount,
        total
      },
      payment,
      status: 'completed'
    });

    await sale.save();

    // Actualizar cash cut si existe el header X-Cash-Cut-Id
    const cashCutId = req.headers['x-cash-cut-id'];
    if (cashCutId) {
      await updateCashCutWithDocument(cashCutId, 'sale', sale._id.toString(), {
        payment: sale.payment,
        totals: sale.totals
      });
    }

    // Reducir el stock de cada producto
    for (const { product, quantity } of productsData) {
      product.stock -= quantity;
      await product.save();
    }

    // Poblar la información del cliente y vendedor para la respuesta
    await sale.populate([
      { path: 'clientId', select: 'profile.names profile.lastNames email' },
      { path: 'userId', select: 'profile.names profile.lastNames email' },
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
router.get('/:storeId/getAll', async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await validateStoreExists(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    const sales = await Sale.find({ storeId })
      .populate('clientId', 'profile')
      .populate('userId', 'profile')
      .sort({ createdAt: -1 });

    res.status(200).json({ sales });

  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({
      message: 'Error al obtener las ventas',
      error: error.message
    });
  }
});

// GET - Obtener una venta específica
router.get('/:storeId/getById/:id', async (req, res) => {
  try {
    const { storeId, id } = req.params;

    const store = await validateStoreExists(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    const sale = await Sale.findOne({ _id: id, storeId })
      .populate('clientId', 'profile.names profile.lastNames email')
      .populate('userId', 'profile.names profile.lastNames email')
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
router.get('/:storeId/stats/summary', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, sellerId } = req.query;

    const store = await validateStoreExists(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    const filters = { status: 'completed', storeId };

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    if (sellerId) filters.userId = sellerId;

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
router.patch('/:storeId/:id/status', async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const { status, reason } = req.body;

    const store = await validateStoreExists(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    if (!['cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        message: 'Estado inválido. Debe ser "cancelled" o "refunded"'
      });
    }

    const sale = await Sale.findOne({ _id: id, storeId });

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
        if (product && product.storeId === storeId) {
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

export const routeConfig = { path: "/v1/sales", router }