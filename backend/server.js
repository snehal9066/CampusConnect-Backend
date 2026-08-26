require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
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
const adminRoutes = require("./routes/adminRoutes");

// ================= SOCKET =================

const { socketHandler } = require("./socket/socket");

// ================= DATABASE =================

connectDB();

// ================= APP =================

const app = express();

const server = http.createServer(app);

// If deployed behind Render/Vercel/proxy
app.set("trust proxy", 1);

// ================= SECURITY =================

// Helmet adds security-related HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ================= ALLOWED ORIGINS =================

const allowedOrigins = [
  "http://localhost:3000",
  "https://campus-connect-frontend-nine.vercel.app",
  "https://campus-connect-frontend-iiht76k-snehal9066s-projects.vercel.app",
];

// ================= CORS =================

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server requests without Origin
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app");

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ================= BODY PARSING =================

// Prevent extremely large JSON requests
app.use(
  express.json({
    limit: "1mb",
  })
);

// ================= GLOBAL API RATE LIMIT =================

// Protects the API from excessive requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// ================= LOGIN RATE LIMIT =================

// Stronger protection specifically for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    message:
      "Too many login attempts. Please wait 15 minutes and try again.",
  },

  // Only count failed login attempts
  skipSuccessfulRequests: true,
});

// Apply only to login
app.use("/api/auth/login", loginLimiter);

// ================= ROUTES =================

// Authentication
app.use("/api/auth", authRoutes);

// Admin
app.use("/api/admin", adminRoutes);

// Friends
app.use("/api/friends", friendRoutes);

// Profile
app.use("/api/profile", profileRoutes);

// Match
app.use("/api/match", matchRoutes);

// Messages
app.use("/api/messages", messageRoutes);

// Dashboard
app.use("/api/dashboard", dashboardRoutes);

// Tea Spots
app.use("/api/tea-spots", teaSpotsRoutes);

// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.send("🚀 CampusConnect Backend Running");
});

// ================= 404 HANDLER =================

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// ================= ERROR HANDLER =================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "Request blocked by server security policy",
    });
  }

  res.status(500).json({
    message: "Something went wrong on the server",
  });
});

// ================= SOCKET.IO =================

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app");

      if (isAllowed) {
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