import mongoose from 'mongoose';

const subscriptionAssignmentSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  userId: {
    type: String,
    required: true,
  },
  subscriptionId: {
    type: String,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  }
}, { timestamps: true });

const SubscriptionAssignment = mongoose.model('SubscriptionAssignment', subscriptionAssignmentSchema);
export default SubscriptionAssignment;