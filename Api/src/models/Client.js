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
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
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
      unique: true,    // Si existe, debe ser único
      sparse: true,    // Permite múltiples registros con valor 'null' o 'undefined'
      trim: true
    }
  },
  status: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);

export default Client;