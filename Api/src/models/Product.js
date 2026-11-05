import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  storeId: {
    type: String,
    required: true,
    ref: 'Store'
  },
  name: {
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
  // Código compartido para vincular el mismo producto entre sucursales.
  // Opcional y retrocompatible: los productos existentes lo tienen en null.
  // El mismo SKU puede repetirse en distintas sucursales (es la identidad
  // del producto lógico), pero es único dentro de una misma sucursal.
  sku: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  // Agregado opcional sin afectar registros anteriores
  imageUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['available', 'unavailable', 'discontinued'],
    default: 'available'
  }
}, { timestamps: true })

// El SKU debe ser único dentro de una sucursal (sparse para no afectar
// productos antiguos sin SKU). Entre sucursales se permite repetir,
// ya que es la clave para vincular el mismo producto.
productSchema.index({ storeId: 1, sku: 1 }, { unique: true, sparse: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
