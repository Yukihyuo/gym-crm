import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  storeId: {
    type: String,
    ref: 'Store',
    required: true
  },
  userId: {
    type: String,
    ref: 'Staff',
    required: false,
    default: null
  },
  clientId: {
    type: String,
    ref: 'Client',
    required: false,
    default: null
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: true
  },
  // Detalles de los productos vendidos
  items: [{
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    productId: {
      type: String,
      ref: 'Product',
      required: true
    },
    name: String,      // Copia del nombre para el historial
    price: {           // Precio al momento de la venta
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: Number
  }],
  // Totales para cálculos rápidos y estadísticas
  totals: {
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 }, // IVA
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  // Información de pago
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'transfer'],
      required: true
    },
    amountPaid: Number,
    change: Number
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  cancellationReason: {
    type: String,
    default: null
  }
}, { timestamps: true, minimize: false });

// Índice para búsquedas rápidas por fecha (Estadísticas)
saleSchema.index({ createdAt: -1 });

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;