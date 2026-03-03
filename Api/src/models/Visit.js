import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  brandId: {
    type: String,
    required: true,
    ref: 'Brand'
  },
  storeId: { // La sucursal donde se registró físicamente por primera vez
    type: String,
    required: true,
    ref: 'Store'
  },
  clientId: {
    type: String,
    required: true,
    ref: 'Client'
  },
  accessMethod: { type: String, enum: ['qr', 'manual', 'biometric'], default: 'qr' },
  isTrial: { type: Boolean, default: false },
  

}, { timestamps: true });

const Visit = mongoose.model('Visit', visitSchema);
export default Visit;