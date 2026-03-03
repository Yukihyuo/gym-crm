import mongoose from "mongoose";
const subscriptionSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  brandId: {
    type: String,
    required: true,
    ref: 'Brand'
  },
  name: { type: String, required: true }, // Ej: "Plan VIP" o "Pase Mensual"
  description: { type: String },

  duration: {
    value: { type: Number, required: true },
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'years'],
      default: 'months'
    }
  },

  price: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'MXN' }
  },

  benefits: [{
    name: { type: String },
    included: { type: Boolean, default: true },
    limit: { type: Number }
  }],

  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }

},
  { timestamps: true });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;