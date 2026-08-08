const Queue = require("../models/Queue");
const Match = require("../models/Match");
const User = require("../models/User");
const Friend = require("../models/Friend");
const { connectedUsers } = require("../socket/socket");

// ======================================================
// CHECK WHETHER TWO USERS ARE COMPATIBLE
// ======================================================

const areUsersCompatible = (userA, userB) => {
  // Purpose must be the same
  if (userA.purpose !== userB.purpose) {
    return false;
  }

  // ====================================================
  // FRIENDSHIP
  // Everyone can match with everyone
  // ====================================================

  if (userA.purpose === "Friendship") {
    return true;
  }

  // ====================================================
  // STUDY BUDDY
  // Everyone can match with everyone
  // ====================================================

  if (userA.purpose === "Study Buddy") {
    return true;
  }

  // ====================================================
  // DATING / COFFEE CHAT
  // Only Male <-> Female
  // ====================================================

  if (
    userA.purpose === "Dating" ||
    userA.purpose === "Coffee Chat"
  ) {
    const maleFemalePair =
      (userA.gender === "Male" &&
        userB.gender === "Female") ||
      (userA.gender === "Female" &&
        userB.gender === "Male");

    if (!maleFemalePair) {
      return false;
    }

    // User A must accept User B
    const aAcceptsB =
      userA.interestedIn === "Everyone" ||
      userA.interestedIn === userB.gender;

    // User B must accept User A
    const bAcceptsA =
      userB.interestedIn === "Everyone" ||
      userB.interestedIn === userA.gender;

    return aAcceptsB && bAcceptsA;
  }

  return false;
};

// ======================================================
// JOIN BLIND MATCH QUEUE
// ======================================================

const joinQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("\n================================");
    console.log("🔎 NEW MATCH REQUEST");
    console.log("User ID:", userId);

    // ==================================================
    // CURRENT USER
    // ==================================================

    const currentUser =
      await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    console.log(
      "========== CURRENT USER =========="
    );

    console.log({
      username: currentUser.username,
      gender: currentUser.gender,
      interestedIn:
        currentUser.interestedIn,
      purpose: currentUser.purpose,
    });

    // ==================================================
    // CHECK IF ALREADY WAITING
    // ==================================================

    const alreadyWaiting =
      await Queue.findOne({
        user: userId,
      });

    if (alreadyWaiting) {
      console.log(
        "⚠️ User already in queue"
      );

      return res.status(400).json({
        message:
          "You are already waiting for a match.",
      });
    }

    // ==================================================
    // GET USERS CURRENTLY IN QUEUE
    // ==================================================

    const waitingUsers =
      await Queue.find({
        user: {
          $ne: userId,
        },
      }).sort({
        createdAt: 1,
      });

    console.log(
      "========== WAITING USERS =========="
    );

    console.log(
      waitingUsers.map((q) => ({
        user: q.user.toString(),
        gender: q.gender,
        interestedIn:
          q.interestedIn,
        purpose: q.purpose,
      }))
    );

    // ==================================================
    // FIND COMPATIBLE PARTNER
    // ==================================================

    let matchedQueueUser = null;
    let matchedPartner = null;

    for (const queueUser of waitingUsers) {
      const partnerUser =
        await User.findById(
          queueUser.user
        );

      // Invalid/deleted user
      if (!partnerUser) {
        await Queue.deleteOne({
          _id: queueUser._id,
        });

        continue;
      }

      // ==================================================
      // CHECK EXISTING MATCH
      // ==================================================

      const existingMatch =
        await Match.findOne({
          $or: [
            {
              user1: userId,
              user2: partnerUser._id,
            },
            {
              user1: partnerUser._id,
              user2: userId,
            },
          ],
          status: "matched",
        });

      if (existingMatch) {
        console.log(
          "⚠️ Already matched:",
          partnerUser.username
        );

        continue;
      }

      console.log(
        "🔍 Checking:",
        currentUser.username,
        "<->",
        partnerUser.username
      );

      console.log({
        currentUser: {
          gender:
            currentUser.gender,
          interestedIn:
            currentUser.interestedIn,
          purpose:
            currentUser.purpose,
        },

        partner: {
          gender:
            partnerUser.gender,
          interestedIn:
            partnerUser.interestedIn,
          purpose:
            partnerUser.purpose,
        },
      });

      // ==================================================
      // COMPATIBILITY CHECK
      // ==================================================

      if (
        areUsersCompatible(
          currentUser,
          partnerUser
        )
      ) {
        matchedQueueUser = queueUser;
        matchedPartner = partnerUser;

        break;
      }
    }

    // ==================================================
    // PARTNER FOUND
    // ==================================================

    if (
      matchedQueueUser &&
      matchedPartner
    ) {
      console.log(
        "🎉 MATCH FOUND!"
      );

      console.log(
        currentUser.username,
        "<->",
        matchedPartner.username
      );

      // =================================================
      // CREATE MATCH
      // =================================================

      const match =
        await Match.create({
          user1: userId,

          user2:
            matchedQueueUser.user,

          purpose:
            currentUser.purpose,

          status: "matched",

          revealUser1: false,

          revealUser2: false,

          revealed: false,
        });

      // =================================================
      // REMOVE PARTNER FROM QUEUE
      // =================================================

      await Queue.deleteOne({
        _id: matchedQueueUser._id,
      });

      console.log(
        "🗑️ Partner removed from queue"
      );

      // =================================================
      // SOCKET.IO
      // =================================================

      const io =
        req.app.get("io");

      const user1Socket =
        connectedUsers.get(
          userId.toString()
        );

      const user2Socket =
        connectedUsers.get(
          matchedQueueUser.user.toString()
        );

      // =================================================
      // PARTNER DATA
      // =================================================

      const partnerData = {
        username:
          matchedPartner.username,

        gender:
          matchedPartner.gender,

        department:
          matchedPartner.department,

        year:
          matchedPartner.year,

        profileImage:
          matchedPartner.profileImage,

        purpose:
          matchedPartner.purpose,
      };

      // =================================================
      // NOTIFY USER 1
      // =================================================

      if (user1Socket) {
        io.to(user1Socket).emit(
          "matchFound",
          {
            matchId:
              match._id,

            partner:
              partnerData,
          }
        );

        console.log(
          "📡 Match notification sent to User 1"
        );
      }

      // =================================================
      // NOTIFY USER 2
      // =================================================

      if (user2Socket) {
        io.to(user2Socket).emit(
          "matchFound",
          {
            matchId:
              match._id,

            partner: {
              username:
                currentUser.username,

              gender:
                currentUser.gender,

              department:
                currentUser.department,

              year:
                currentUser.year,

              profileImage:
                currentUser.profileImage,

              purpose:
                currentUser.purpose,
            },
          }
        );

        console.log(
          "📡 Match notification sent to User 2"
        );
      }

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(200).json({
        matched: true,

        message:
          "🎉 Match Found!",

        matchId:
          match._id,

        partner:
          partnerData,
      });
    }

    // ==================================================
    // NO PARTNER FOUND
    // ==================================================

    console.log(
      "⏳ No compatible partner found"
    );

    // ==================================================
    // ADD CURRENT USER TO QUEUE
    // ==================================================

    await Queue.create({
      user: userId,

      gender:
        currentUser.gender,

      interestedIn:
        currentUser.interestedIn,

      purpose:
        currentUser.purpose,
    });

    console.log(
      `✅ ${currentUser.username} joined the queue`
    );

    return res.status(200).json({
      matched: false,

      message:
        "⏳ Waiting for a compatible student...",
    });
  } catch (err) {
    console.log(
      "❌ MATCH ERROR"
    );

    console.log(err);

    return res.status(500).json({
      message:
        err.message ||
        "Something went wrong while finding a match.",
    });
  }
};

// ======================================================
// CANCEL MATCH SEARCH
// ======================================================

const cancelQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(
      "🛑 CANCEL MATCH SEARCH:",
      userId
    );

    const removed =
      await Queue.findOneAndDelete({
        user: userId,
      });

    if (!removed) {
      return res.status(404).json({
        cancelled: false,

        message:
          "You are not currently searching for a match.",
      });
    }

    console.log(
      "✅ User removed from match queue"
    );

    return res.status(200).json({
      cancelled: true,

      message:
        "Match search cancelled successfully.",
    });
  } catch (err) {
    console.log(
      "❌ CANCEL QUEUE ERROR"
    );

    console.log(err);

    return res.status(500).json({
      cancelled: false,

      message:
        err.message ||
        "Unable to cancel match search.",
    });
  }
};

// ======================================================
// REVEAL IDENTITY
// ======================================================

const revealIdentity = async (
  req,
  res
) => {
  try {
    const {
      matchId,
    } = req.body;

    const userId =
      req.user.id;

    // ==================================================
    // FIND MATCH
    // ==================================================

    const match =
      await Match.findById(
        matchId
      );

    if (!match) {
      return res.status(404).json({
        message:
          "Match not found",
      });
    }

    // ==================================================
    // CHECK USER BELONGS TO MATCH
    // ==================================================

    const isUser1 =
      match.user1.toString() ===
      userId.toString();

    const isUser2 =
      match.user2.toString() ===
      userId.toString();

    if (!isUser1 && !isUser2) {
      return res.status(403).json({
        message:
          "You are not part of this match.",
      });
    }

    // ==================================================
    // MARK USER AS REVEALED
    // ==================================================

    if (isUser1) {
      match.revealUser1 = true;
    }

    if (isUser2) {
      match.revealUser2 = true;
    }

    // ==================================================
    // BOTH USERS REVEALED
    // ==================================================

    if (
      match.revealUser1 &&
      match.revealUser2
    ) {
      match.revealed = true;

      // =================================================
      // CHECK EXISTING FRIENDSHIP
      // =================================================

      const existingFriend =
        await Friend.findOne({
          $or: [
            {
              user1:
                match.user1,

              user2:
                match.user2,
            },

            {
              user1:
                match.user2,

              user2:
                match.user1,
            },
          ],
        });

      // =================================================
      // CREATE FRIENDSHIP
      // =================================================

      if (!existingFriend) {
        await Friend.create({
          user1:
            match.user1,

          user2:
            match.user2,
        });

        console.log(
          "🤝 Friendship created"
        );
      }
    }

    await match.save();

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      revealed:
        match.revealed,

      message:
        match.revealed
          ? "🎉 Identity Revealed! You are now friends."
          : "👀 Waiting for the other user to reveal their identity...",
    });
  } catch (err) {
    console.log(
      "❌ REVEAL ERROR"
    );

    console.log(err);

    return res.status(500).json({
      message:
        err.message ||
        "Something went wrong.",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  joinQueue,
  cancelQueue,
  revealIdentity,
};