const mongoose = require("mongoose");

const connectDB = async () => {
  console.log("DB: Starting connection");

  // 👇 ADD THIS LINE
  console.log("MONGO_URI =", process.env.MONGO_URI);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.log("❌ Error Name:", err.name);
    console.log("❌ Error Message:", err.message);
  }
};

module.exports = connectDB;