const Queue = require("../models/Queue");
const Match = require("../models/Match");
const User = require("../models/User");
const { connectedUsers } = require("../socket/socket");

// ======================================================
// CHECK ANONYMOUS CHAT COMPATIBILITY
// ======================================================
//
// Both users must accept each other's gender.
//
// Examples:
//
// Male -> Female
// Female -> Male
// ✅ Compatible
//
// Male -> Male
// Both choose Male
// ✅ Compatible
//
// Female -> Female
// Both choose Female
// ✅ Compatible
//
// Everyone can match with anyone, as long as the
// other user's preference also accepts them.
// ======================================================

const areUsersCompatible = (userA, userB) => {
  const preferenceA = userA.interestedIn || "Everyone";
  const preferenceB = userB.interestedIn || "Everyone";

  const aAcceptsB =
    preferenceA === "Everyone" ||
    preferenceA === userB.gender;

  const bAcceptsA =
    preferenceB === "Everyone" ||
    preferenceB === userA.gender;

  return aAcceptsB && bAcceptsA;
};

// ======================================================
// JOIN ANONYMOUS CHAT QUEUE
// ======================================================

const joinQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("\n================================");
    console.log("NEW ANONYMOUS CHAT REQUEST");
    console.log("User ID:", userId);
    console.log("================================");

    // ==================================================
    // GET CURRENT USER
    // ==================================================

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ==================================================
    // SAVE SELECTED CHAT PREFERENCE
    // ==================================================

    const requestedPreference = req.body?.interestedIn;

    const validPreferences = [
      "Male",
      "Female",
      "Everyone",
    ];

    if (requestedPreference) {
      if (!validPreferences.includes(requestedPreference)) {
        return res.status(400).json({
          message: "Invalid chat preference selected.",
        });
      }

     await User.findByIdAndUpdate(
  userId,
  {
    $set: {
      interestedIn: requestedPreference,
    },
  },
  {
    new: true,
    runValidators: false,
  }
);

currentUser.interestedIn =
  requestedPreference;
    }

    console.log("CURRENT USER:");
    console.log({
      username: currentUser.username,
      gender: currentUser.gender,
      interestedIn: currentUser.interestedIn,
    });

    // ==================================================
    // CHECK IF USER IS ALREADY WAITING
    // ==================================================

    const alreadyWaiting = await Queue.findOne({
      user: userId,
    });

    if (alreadyWaiting) {
      return res.status(400).json({
        message:
          "You are already waiting for someone to connect.",
      });
    }

    // ==================================================
    // GET WAITING USERS
    // ==================================================

    const waitingUsers = await Queue.find({
      user: {
        $ne: userId,
      },
      purpose: "Anonymous Chat",
    }).sort({
      createdAt: 1,
    });

    console.log(
      "Users currently waiting:",
      waitingUsers.length
    );

    // ==================================================
    // FIND COMPATIBLE PARTNER
    // ==================================================

    let matchedQueueUser = null;
    let matchedPartner = null;

    for (const queueUser of waitingUsers) {
      const partnerUser = await User.findById(
        queueUser.user
      );

      // ================================================
      // REMOVE INVALID / DELETED USERS
      // ================================================

      if (!partnerUser) {
        await Queue.deleteOne({
          _id: queueUser._id,
        });

        continue;
      }

      // ================================================
      // CHECK IF PARTNER IS SUSPENDED
      // ================================================

      if (partnerUser.isSuspended) {
        await Queue.deleteOne({
          _id: queueUser._id,
        });

        continue;
      }

      // ================================================
      // CHECK EXISTING ACTIVE ANONYMOUS MATCH
      // ================================================

      const existingMatch = await Match.findOne({
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
        purpose: "Anonymous Chat",
        status: "matched",
      });

      if (existingMatch) {
        console.log(
          "Skipping existing anonymous match:",
          partnerUser.username
        );

        continue;
      }

      // ================================================
      // CHECK GENDER COMPATIBILITY
      // ================================================

      const compatible = areUsersCompatible(
        currentUser,
        partnerUser
      );

      console.log(
        `Checking compatibility: ${currentUser.username} (${currentUser.gender}, wants ${currentUser.interestedIn}) <-> ${partnerUser.username} (${partnerUser.gender}, wants ${partnerUser.interestedIn})`
      );

      if (!compatible) {
        console.log("Users are not compatible");

        continue;
      }

      // ================================================
      // COMPATIBLE PARTNER FOUND
      // ================================================

      matchedQueueUser = queueUser;
      matchedPartner = partnerUser;

      console.log(
        "Compatible partner found:",
        matchedPartner.username
      );

      break;
    }

    // ==================================================
    // MATCH FOUND
    // ==================================================

    if (matchedQueueUser && matchedPartner) {
      console.log("MATCH FOUND!");

      console.log(
        `${currentUser.username} <-> ${matchedPartner.username}`
      );

      // =================================================
      // CREATE ANONYMOUS CHAT MATCH
      // =================================================

      const match = await Match.create({
        user1: userId,

        user2: matchedPartner._id,

        purpose: "Anonymous Chat",

        status: "matched",

        revealUser1: false,

        revealUser2: false,

        revealed: false,
      });

      console.log(
        "Anonymous chat match created:",
        match._id
      );

      // =================================================
      // REMOVE PARTNER FROM QUEUE
      // =================================================

      await Queue.deleteOne({
        _id: matchedQueueUser._id,
      });

      console.log(
        "Partner removed from queue"
      );

      // =================================================
      // SOCKET.IO
      // =================================================

      const io = req.app.get("io");

      const user1Socket = connectedUsers.get(
        userId.toString()
      );

      const user2Socket = connectedUsers.get(
        matchedPartner._id.toString()
      );

      // =================================================
      // ANONYMOUS PARTNER DATA
      // =================================================

      const partnerData = {
        anonymous: true,
        purpose: "Anonymous Chat",
      };

      // =================================================
      // NOTIFY CURRENT USER
      // =================================================

      if (user1Socket) {
        io.to(user1Socket).emit(
          "matchFound",
          {
            matchId: match._id,
            partner: partnerData,
          }
        );

        console.log(
          "Match notification sent to User 1"
        );
      }

      // =================================================
      // NOTIFY MATCHED PARTNER
      // =================================================

      if (user2Socket) {
        io.to(user2Socket).emit(
          "matchFound",
          {
            matchId: match._id,

            partner: {
              anonymous: true,
              purpose: "Anonymous Chat",
            },
          }
        );

        console.log(
          "Match notification sent to User 2"
        );
      } else {
        console.log(
          "Partner socket not currently connected"
        );
      }

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(200).json({
        matched: true,

        message:
          "Connection found! Start chatting anonymously.",

        matchId: match._id,

        partner: partnerData,
      });
    }

    // ==================================================
    // NO COMPATIBLE PARTNER FOUND
    // ==================================================

    console.log(
      "No compatible partner found"
    );

    // ==================================================
    // ADD CURRENT USER TO QUEUE
    // ==================================================

    await Queue.create({
      user: userId,
      purpose: "Anonymous Chat",
    });

    console.log(
      `${currentUser.username} joined the anonymous chat queue`
    );

    return res.status(200).json({
      matched: false,

      message:
        "Waiting for a compatible student...",
    });
  } catch (err) {
    console.error(
      "JOIN QUEUE ERROR:",
      err
    );

    return res.status(500).json({
      message:
        "Something went wrong while finding a connection.",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : undefined,
    });
  }
};

// ======================================================
// CANCEL ANONYMOUS CHAT SEARCH
// ======================================================

const cancelQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    const queueEntry = await Queue.findOne({
      user: userId,
      purpose: "Anonymous Chat",
    });

    if (!queueEntry) {
      return res.status(404).json({
        message:
          "You are not currently waiting for a connection.",
      });
    }

    await Queue.deleteOne({
      _id: queueEntry._id,
    });

    console.log(
      "User cancelled anonymous chat search:",
      userId
    );

    return res.status(200).json({
      message:
        "Connection search cancelled.",
    });
  } catch (err) {
    console.error(
      "CANCEL QUEUE ERROR:",
      err
    );

    return res.status(500).json({
      message:
        "Something went wrong while cancelling the search.",
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  joinQueue,
  cancelQueue,
};