import mongoose from 'mongoose';

const terminalSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  uuid: { type: String, required: true, unique: true },
  storeId: { type: String, ref: 'Store', required: true },
  name: { type: String, default: 'Punto de Acceso' },

  deviceId: {
    type: String,
    ref: 'HardwareModel',
    required: false
  },

  isLinked: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Terminal = mongoose.model('Terminal', terminalSchema);
export default Terminal;