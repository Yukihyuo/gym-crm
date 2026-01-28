import mongoose from "mongoose";

const roleAssignmentSchema = new mongoose.Schema({
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    userId: {
      type: String,
      required: true,
      ref: 'User'
    },
    roleId: {
      type: String,
      required: true,
      ref: 'Role'
    }
});

const RoleAssignment = mongoose.model("RoleAssignment", roleAssignmentSchema);
export default RoleAssignment;