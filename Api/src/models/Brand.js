import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String
  },
  website: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  settings: {
    requireCashClosing: { type: Boolean, default: false }, 
  },
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;