import mongoose from 'mongoose';

const hardwareModelSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: { type: String, required: true },
  vid: { type: String, required: true },
  pid: { type: String, required: true },
  driver: {
    type: String,
    required: true,
    // enum: ['as608', 'zk_generic', 'digital_persona']
  },
  baudRate: { type: Number, default: 57600 },
  description: String
});

const HardwareModel = mongoose.model('HardwareModel', hardwareModelSchema);
export default HardwareModel;