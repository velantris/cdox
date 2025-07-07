import mongoose from "mongoose";
// db name cdocx
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    await mongoose.connect(process.env.MONGO_URI as string, {
        dbName: "cdocx"
    });
    console.log("Connected to MongoDB");
}

export default connectDB;