require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

// ================= ROUTES =================

const friendRoutes = require("./routes/friendRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const matchRoutes = require("./routes/matchRoutes");
const messageRoutes = require("./routes/messageRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const teaSpotsRoutes = require("./routes/teaSpotsRoutes");

// ================= SOCKET =================

const { socketHandler } = require("./socket/socket");

// ================= DATABASE =================

connectDB();

// ================= APP =================

const app = express();

const server = http.createServer(app);

// ================= ALLOWED ORIGINS =================

const allowedOrigins = [
  "http://localhost:3000",
  "https://campus-connect-frontend-nine.vercel.app",
  "https://campus-connect-frontend-iiht76k-snehal9066s-projects.vercel.app",
];

// ================= MIDDLEWARE =================

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an origin, such as Postman
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ================= ROUTES =================

app.use("/api/auth", authRoutes);

app.use("/api/friends", friendRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/match", matchRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/tea-spots", teaSpotsRoutes);

// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.send("🚀 CampusConnect Backend Running");
});

// ================= SOCKET.IO =================

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize Socket.IO
socketHandler(io);

// Make io available throughout the application
app.set("io", io);

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});