import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  _id: {
    type: String,
    // Genera un ObjectId nuevo y lo convierte a string por defecto
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
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  accessCode: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true
  },
  fingerprintId: { type: String, default: null },
  password: {
    type: String,
    required: true
  },
  profile: {
    names: {
      type: String,
      required: true
    },
    lastNames: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: false, // No es obligatorio
      trim: true
    }
  },
  status: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

clientSchema.index({ brandId: 1, accessCode: 1 }, { unique: true });
clientSchema.index(
  { brandId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $gt: '' } }
  }
);
clientSchema.index(
  { brandId: 1, 'profile.phone': 1 },
  {
    unique: true,
    partialFilterExpression: { 'profile.phone': { $type: 'string', $gt: '' } }
  }
);


const Client = mongoose.model('Client', clientSchema);

export default Client;