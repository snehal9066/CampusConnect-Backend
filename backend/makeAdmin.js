require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");
const connectDB = require("./config/db");

const makeAdmin = async () => {
  try {
    await connectDB();

    const user = await User.findOneAndUpdate(
      { username: "snehal77" },
      { role: "admin", isSuspended: false },
      { new: true }
    );

    if (!user) {
      console.log("❌ User snehal77 not found");
    } else {
      console.log("✅ Admin created successfully!");
      console.log("Username:", user.username);
      console.log("Role:", user.role);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

makeAdmin();