const Message = require("../models/Message");

// Store connected users
const connectedUsers = new Map();

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    // Register logged-in user
    socket.on("registerUser", (userId) => {
      connectedUsers.set(userId, socket.id);
      console.log(`✅ Registered User: ${userId}`);
    });

    // Join chat room
    socket.on("joinRoom", (matchId) => {
      socket.join(matchId);
      console.log(`📥 Joined Room: ${matchId}`);
    });

    // Send Message
    socket.on("sendMessage", async (data) => {
      // Typing Indicator
socket.on("typing", (data) => {
  socket.to(data.matchId).emit("userTyping");
});

socket.on("stopTyping", (data) => {
  socket.to(data.matchId).emit("userStoppedTyping");
});
      try {
        const message = await Message.create({
          match: data.matchId,
          sender: data.sender,
          text: data.text,
        });

        io.to(data.matchId).emit("receiveMessage", message);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 User Disconnected:", socket.id);

      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });
};

module.exports = {
  socketHandler,
  connectedUsers,
};