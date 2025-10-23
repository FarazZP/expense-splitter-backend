import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
