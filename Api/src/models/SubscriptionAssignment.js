import mongoose from 'mongoose';

const subscriptionAssignmentSchema = new mongoose.Schema({
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
    ref: 'Client'
  },
  planId: {
    type: String,
    ref: 'Subscription'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  pricePaid: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  }
}, { timestamps: true });

const SubscriptionAssignment = mongoose.model('SubscriptionAssignment', subscriptionAssignmentSchema);
export default SubscriptionAssignment;