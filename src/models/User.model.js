// models/User.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        avatar: { type: String },
        phone: { 
            type: String, 
            required: true, 
            unique: true,
            validate: {
                validator: function(v) {
                    return /^\+[1-9]\d{1,14}$/.test(v);
                },
                message: 'Phone number must be in E.164 format (e.g., +1234567890)'
            }
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("User", userSchema);