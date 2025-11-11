import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
    {
        group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: true,
        },
        from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        },
        to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        },
        amount: {
        type: Number,
        required: true,
        },
        expense: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Expense",
        },
        note: {
        type: String,
        default: '',
        },
        status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed',
        },
        settledAt: {
        type: Date,
        default: Date.now,
        },
    },
    {
        timestamps: true,
    }
)

export default mongoose.model("Settlement", settlementSchema);