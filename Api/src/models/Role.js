import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  modules:{
    type: [String],
    default: []
  }
});

const Role = mongoose.model("Role", roleSchema);
export default Role;