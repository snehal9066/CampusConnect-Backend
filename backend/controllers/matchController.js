const Queue = require("../models/Queue");
const Match = require("../models/Match");
const User = require("../models/User");
const { connectedUsers } = require("../socket/socket");

// ======================================================
// CHECK ANONYMOUS CHAT COMPATIBILITY
// ======================================================
//
// Example:
//
// User A: Male, wants Female
// User B: Female, wants Male
//
// Result: Compatible
//
// Both users must accept each other's gender.
// ======================================================

const areUsersCompatible = (userA, userB) => {
  const preferenceA =
    userA.interestedIn || "Everyone";

  const preferenceB =
    userB.interestedIn || "Everyone";

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
    // SAVE CURRENT CHAT PREFERENCE
    // ==================================================

    const requestedPreference =
      req.body?.interestedIn;

    const validPreferences = [
      "Male",
      "Female",
      "Everyone",
    ];

    if (requestedPreference) {
      if (
        !validPreferences.includes(
          requestedPreference
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid chat preference selected.",
        });
      }

      currentUser.interestedIn =
        requestedPreference;

      await currentUser.save();
    }

    console.log("CURRENT USER:");

    console.log({
      username: currentUser.username,
      gender: currentUser.gender,
      interestedIn: currentUser.interestedIn,
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
        "User is already waiting in queue"
      );

      return res.status(400).json({
        message:
          "You are already waiting for someone to connect.",
      });
    }

    // ==================================================
    // GET WAITING USERS
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
      "Users currently waiting:",
      waitingUsers.length
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

      // ================================================
      // REMOVE INVALID USERS
      // ================================================

      if (!partnerUser) {
        await Queue.deleteOne({
          _id: queueUser._id,
        });

        continue;
      }

      // ================================================
      // CHECK IF ALREADY IN ACTIVE MATCH
      // ================================================

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
          "Skipping existing match:",
          partnerUser.username
        );

        continue;
      }

      // ================================================
      // CHECK GENDER COMPATIBILITY
      // ================================================

      const compatible =
        areUsersCompatible(
          currentUser,
          partnerUser
        );

      console.log(
        `Checking compatibility: ${currentUser.username} (${currentUser.gender}, wants ${currentUser.interestedIn}) <-> ${partnerUser.username} (${partnerUser.gender}, wants ${partnerUser.interestedIn})`
      );

      if (!compatible) {
        console.log(
          "Users are not compatible"
        );

        continue;
      }

      // ================================================
      // COMPATIBLE USER FOUND
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

    if (
      matchedQueueUser &&
      matchedPartner
    ) {
      console.log("MATCH FOUND!");

      console.log(
        `${currentUser.username} <-> ${matchedPartner.username}`
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
            "Anonymous Chat",

          status: "matched",

          revealUser1: false,

          revealUser2: false,

          revealed: false,
        });

      // =================================================
      // REMOVE MATCHED USER FROM QUEUE
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
      // ANONYMOUS PARTNER DATA
      // =================================================

      const partnerData = {
        anonymous: true,

        purpose:
          "Anonymous Chat",
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
      // NOTIFY PARTNER
      // =================================================

      if (user2Socket) {
        io.to(user2Socket).emit(
          "matchFound",
          {
            matchId: match._id,

            partner: {
              anonymous: true,

              purpose:
                "Anonymous Chat",
            },
          }
        );

        console.log(
          "Match notification sent to User 2"
        );

      } else {
        console.log(
          "Partner is currently offline or socket not registered"
        );
      }

      // =================================================
      // RETURN RESPONSE
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
    // NO MATCH FOUND
    // ==================================================

    console.log(
      "No compatible partner found"
    );

    // ==================================================
    // ADD USER TO QUEUE
    //
    // Queue schema only contains:
    // - user
    // - purpose
    // ==================================================

    await Queue.create({
      user: userId,

      purpose:
        "Anonymous Chat",
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
    });
  }
};

// ======================================================
// CANCEL ANONYMOUS CHAT SEARCH
// ======================================================

const cancelQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    const queueEntry =
      await Queue.findOne({
        user: userId,
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