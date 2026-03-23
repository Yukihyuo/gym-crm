import mongoose from 'mongoose';

const cashClosingSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  staffId: { type: String, required: true, ref: 'Staff' }, // Referencia a tu string _id del empleado
  brandId: { type: String, required: true, ref: 'Brand' }, // Referencia a tu string _id de la marca
  openingDate: { type: Date, required: true },
  closingDate: { type: Date, default: Date.now },

  // Monto con el que inició el turno (Fondo de caja)
  initialCash: { type: Number, required: true, default: 0 },

  // Lo que el sistema registró (antes "expectedSales")
  systemTotals: {
    byMethod: {
      cash: { type: Number, default: 0 },
      transfer: { type: Number, default: 0 },
      card: { type: Number, default: 0 }
    },
    byCategory: {
      products: { type: Number, default: 0 },
      subscriptions: { type: Number, default: 0 }
    },
    grandTotal: { type: Number, required: true }
  },

  // Lo que el empleado reporta que hay físicamente
  reportedTotals: {
    cashInHand: { type: Number, required: true }, // Conteo físico de billetes/monedas
    transferReceipts: { type: Number, default: 0 }, // Suma de comprobantes de transferencia
    cardSlips: { type: Number, default: 0 }        // Suma de vouchers de la terminal
  },

  // Diferencia calculada: (reportedTotals.cashInHand) - (systemTotals.byMethod.cash + initialCash)
  cashDifference: { type: Number, required: true },
  
  status: { 
    type: String, 
    enum: ['balanced', 'shortage', 'surplus', 'pending','incomplete'], 
    default: 'balanced' 
  },
  
  salesIds: [{ type: String, ref: 'Sale' }], // Array de tus IDs (Strings) de ventas y suscripciones
  subscriptionAssignmentIds: [{ type: String, ref: 'SubscriptionAssignment' }], // Array de IDs de asignaciones de suscripciones
  notes: { type: String }
}, { timestamps: true });

const CashCut = mongoose.model('CashCut', cashClosingSchema);

export default CashCut;