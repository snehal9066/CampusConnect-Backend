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

// ================= SOCKET =================

const { socketHandler } = require("./socket/socket");

// ================= DATABASE =================

connectDB();

// ================= APP =================

const app = express();

const server = http.createServer(app);

// ================= MIDDLEWARE =================

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://campus-connect-frontend-nine.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// ================= ROUTES =================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
  "/api/friends",
  friendRoutes
);

app.use(
  "/api/match",
  matchRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

// ⭐ NEW DASHBOARD ROUTE
app.use(
  "/api/dashboard",
  dashboardRoutes
);

// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.send(
    "🚀 CampusConnect Backend Running"
  );
});

// ================= SOCKET.IO =================

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://campus-connect-frontend-nine.vercel.app",
    ],
    methods: [
      "GET",
      "POST",
    ],
    credentials: true,
  },
});

// Initialize Socket.IO
socketHandler(io);

// Make io available throughout the application
app.set("io", io);

// ================= SERVER =================

const PORT =
  process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});