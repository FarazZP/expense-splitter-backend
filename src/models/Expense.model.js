import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    splitBetween: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        share: { type: Number, required: true },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    receipt: {
      url: { type: String },
      publicId: { type: String },
      filename: { type: String },
    },
    tags: [{ type: String, trim: true }],
    location: {
      name: { type: String },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number] }, // [longitude, latitude]
      },
    },
  },
  { timestamps: true }
);

expenseSchema.index({ group: 1, createdAt: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model("Expense", expenseSchema);
