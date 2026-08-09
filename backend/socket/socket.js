const Message = require("../models/Message");

// Store connected users
// userId -> latest socketId (for backwards compatibility)
const connectedUsers = new Map();

// userId -> Set of socketIds (for multi-tab / multi-device support)
const userSocketsMap = new Map();

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    // Register logged-in user
    socket.on("registerUser", (userId) => {
      if (!userId) return;

      const id = String(userId);
      connectedUsers.set(id, socket.id);

      let sockets = userSocketsMap.get(id);
      if (!sockets) {
        sockets = new Set();
        userSocketsMap.set(id, sockets);
      }
      const isFirstConnection = sockets.size === 0;
      sockets.add(socket.id);

      console.log(`✅ Registered User: ${id} (Sockets: ${sockets.size})`);

      if (isFirstConnection) {
        // Tell everyone that this user is online
        io.emit("userOnline", id);
      }
    });

    // Check online status of a specific user
    socket.on("checkUserStatus", (targetUserId) => {
      if (!targetUserId) return;
      const id = String(targetUserId);
      const sockets = userSocketsMap.get(id);
      const isOnline = Boolean(sockets && sockets.size > 0);
      socket.emit("userStatusResult", { userId: id, isOnline });
    });

    // Explicit logout
    socket.on("logout", (userId) => {
      if (!userId) return;

      const id = String(userId);
      const sockets = userSocketsMap.get(id);

      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketsMap.delete(id);
          connectedUsers.delete(id);
          console.log(`🔴 User Logged Out: ${id}`);
          io.emit("userOffline", id);
        }
      } else if (connectedUsers.get(id) === socket.id) {
        connectedUsers.delete(id);
        io.emit("userOffline", id);
      }

      socket.disconnect(true);
    });

    // Join chat room
    socket.on("joinRoom", (matchId) => {
      socket.join(matchId);
      console.log(`📥 Joined Room: ${matchId}`);
    });

    // Send Message
    socket.on("sendMessage", async (data) => {
      try {
        const message = await Message.create({
          match: data.matchId,
          sender: data.sender,
          text: data.text,
        });

        io.to(data.matchId).emit("receiveMessage", message);
      } catch (err) {
        console.error("❌ Message error:", err);
      }
    });

    // Typing indicator
    socket.on("typing", (data) => {
      socket.to(data.matchId).emit("userTyping");
    });

    socket.on("stopTyping", (data) => {
      socket.to(data.matchId).emit("userStoppedTyping");
    });

    // Browser closed / connection lost
    socket.on("disconnect", () => {
      console.log("🔴 User Disconnected:", socket.id);

      for (const [userId, sockets] of userSocketsMap.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSocketsMap.delete(userId);
            if (connectedUsers.get(userId) === socket.id) {
              connectedUsers.delete(userId);
            }
            console.log(`🔴 User Offline: ${userId}`);
            io.emit("userOffline", userId);
          }
          break;
        }
      }
    });
  });
};

module.exports = {
  socketHandler,
  connectedUsers,
  userSocketsMap,
};