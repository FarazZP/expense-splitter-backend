import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("DATABASE Connected");
    } catch (error) {
        console.error("Connection to DATABASE failed: ", error.message);
        process.exit(1);
    }
}
