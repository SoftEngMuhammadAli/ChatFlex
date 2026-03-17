import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);

    await mongoose.connect(process.env.DATABASE_URL, {
      // Wait 10 seconds for initial connection
      connectTimeoutMS: 10000,
      // Fail fast if server not found
      serverSelectionTimeoutMS: 5000,
    });

    console.log("🚀 MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);

    if (error.message.includes("timed out")) {
      console.error(
        "💡 TIP: This is likely an IP Whitelisting issue. Check your MongoDB Atlas 'Network Access' settings.",
      );
    }

    process.exit(1);
  }
};

export default connectDB;
