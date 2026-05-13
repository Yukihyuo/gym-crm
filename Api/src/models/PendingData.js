import mongoose from 'mongoose';

const pendingDataSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  type: { type: String, required: true },
  sourceId: { type: String, required: true },
  value: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-eliminación
});

// Índice para búsquedas rápidas por código y tipo
pendingDataSchema.index({ value: 1, type: 1 });

const PendingData = mongoose.model('PendingData', pendingDataSchema);
export default PendingData;