import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'unavailable', 'discontinued'],
    default: 'available'
  }
}, { timestamps: true })

const Product = mongoose.model('Product', productSchema);
export default Product;
