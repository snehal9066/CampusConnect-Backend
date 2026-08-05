const Queue = require("../models/Queue");
const Match = require("../models/Match");
const User = require("../models/User");
const Friend = require("../models/Friend");
const { connectedUsers } = require("../socket/socket");

// =============================
// Join Blind Match Queue
// =============================
const joinQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    // Current user
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Already waiting?
    const alreadyWaiting = await Queue.findOne({
      user: userId,
    });

    if (alreadyWaiting) {
      return res.status(400).json({
        message: "You are already in the queue",
      });
    }

    // Find compatible partner
    const partner = await Queue.findOne({
      gender: currentUser.interestedIn,
      interestedIn: currentUser.gender,
      purpose: currentUser.purpose,
      user: { $ne: userId },
    });

    // ===========================
    // Partner Found
    // ===========================

    if (partner) {

      const partnerUser = await User.findById(partner.user).select(
        "username gender department year profileImage"
      );

      const match = await Match.create({
        user1: userId,
        user2: partner.user,
        purpose: currentUser.purpose,
        status: "matched",

        revealUser1: false,
        revealUser2: false,
        revealed: false,
      });

      await Queue.deleteOne({
        _id: partner._id,
      });

      const io = req.app.get("io");

      const user1Socket = connectedUsers.get(
        userId.toString()
      );

      const user2Socket = connectedUsers.get(
        partner.user.toString()
      );

      // Notify User 1
      if (user1Socket) {
        io.to(user1Socket).emit("matchFound", {
          matchId: match._id,
          partner: partnerUser,
        });
      }

      // Notify User 2
      if (user2Socket) {
        io.to(user2Socket).emit("matchFound", {
          matchId: match._id,
          partner: currentUser,
        });
      }

      return res.status(200).json({
        matched: true,
        message: "Match Found!",
        matchId: match._id,
        partner: partnerUser,
      });

    }

    // ===========================
    // No Partner -> Join Queue
    // ===========================

    await Queue.create({
      user: userId,
      gender: currentUser.gender,
      interestedIn: currentUser.interestedIn,
      purpose: currentUser.purpose,
    });

    return res.status(200).json({
      matched: false,
      message: "Waiting for a partner...",
    });

  } catch (err) {

    return res.status(500).json({
      message: err.message,
    });

  }
};

// =============================
// Reveal Identity
// =============================

const revealIdentity = async (req, res) => {

  try {

    const { matchId } = req.body;

    const userId = req.user.id;

    const match = await Match.findById(matchId);

    if (!match) {

      return res.status(404).json({
        message: "Match not found",
      });

    }

    // User1 Revealed

    if (match.user1.toString() === userId) {
      match.revealUser1 = true;
    }

    // User2 Revealed

    if (match.user2.toString() === userId) {
      match.revealUser2 = true;
    }

    // Both users revealed

    if (match.revealUser1 && match.revealUser2) {

      match.revealed = true;

      // Already friends?

      const existingFriend = await Friend.findOne({

        $or: [

          {
            user1: match.user1,
            user2: match.user2,
          },

          {
            user1: match.user2,
            user2: match.user1,
          },

        ],

      });

      // Create friend only once

      if (!existingFriend) {

        await Friend.create({

          user1: match.user1,
          user2: match.user2,

        });

      }

    }

    await match.save();

    return res.status(200).json({

      revealed: match.revealed,

      message: match.revealed
        ? "🎉 Identity Revealed! You are now friends."
        : "Waiting for the other user to reveal their identity...",

    });

  } catch (err) {

    return res.status(500).json({

      message: err.message,

    });

  }

};

module.exports = {
  joinQueue,
  revealIdentity,
};