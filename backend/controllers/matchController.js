const Queue = require("../models/Queue");
const Match = require("../models/Match");
const User = require("../models/User");
const Friend = require("../models/Friend");
const { connectedUsers } = require("../socket/socket");

// ======================================================
// STUDY BUDDY COMPATIBILITY SCORE
// ======================================================

const getStudyBuddyScore = (userA, userB) => {
  let score = 0;

  // Same department - 20 points
  if (
    userA.department &&
    userB.department &&
    userA.department.toLowerCase() ===
      userB.department.toLowerCase()
  ) {
    score += 20;
  }

  // Same year - 10 points
  if (
    userA.year &&
    userB.year &&
    userA.year === userB.year
  ) {
    score += 10;
  }

  // Common subjects - 30 points
  const subjectsA = Array.isArray(userA.studySubjects)
    ? userA.studySubjects.map((s) =>
        String(s).toLowerCase().trim()
      )
    : [];

  const subjectsB = Array.isArray(userB.studySubjects)
    ? userB.studySubjects.map((s) =>
        String(s).toLowerCase().trim()
      )
    : [];

  const commonSubjects = subjectsA.filter((subject) =>
    subjectsB.includes(subject)
  );

  if (commonSubjects.length > 0) {
    const subjectScore = Math.min(
      commonSubjects.length * 10,
      30
    );

    score += subjectScore;
  }

  // Common interests - 15 points
  const interestsA = Array.isArray(userA.interests)
    ? userA.interests.map((i) =>
        String(i).toLowerCase().trim()
      )
    : [];

  const interestsB = Array.isArray(userB.interests)
    ? userB.interests.map((i) =>
        String(i).toLowerCase().trim()
      )
    : [];

  const commonInterests = interestsA.filter((interest) =>
    interestsB.includes(interest)
  );

  if (commonInterests.length > 0) {
    const interestScore = Math.min(
      commonInterests.length * 5,
      15
    );

    score += interestScore;
  }

  // Same availability - 15 points
  const availabilityA = Array.isArray(
    userA.studyAvailability
  )
    ? userA.studyAvailability.map((a) =>
        String(a).toLowerCase().trim()
      )
    : [];

  const availabilityB = Array.isArray(
    userB.studyAvailability
  )
    ? userB.studyAvailability.map((a) =>
        String(a).toLowerCase().trim()
      )
    : [];

  const commonAvailability = availabilityA.filter(
    (time) => availabilityB.includes(time)
  );

  if (commonAvailability.length > 0) {
    score += 15;
  }

  // Same study mode - 10 points
  const modeA = userA.studyMode || "Both";
  const modeB = userB.studyMode || "Both";

  if (
    modeA === modeB ||
    modeA === "Both" ||
    modeB === "Both"
  ) {
    score += 10;
  }

  return Math.min(score, 100);
};

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
// GET MATCH SCORE
// ======================================================

const getCompatibilityScore = (userA, userB) => {
  if (userA.purpose === "Study Buddy") {
    return getStudyBuddyScore(userA, userB);
  }

  // Existing connection types don't use scoring
  return 100;
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

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Sync purpose from request body if provided
    const requestedPurpose = req.body && req.body.purpose;
    const validPurposes = ["Friendship", "Dating", "Study Buddy", "Coffee Chat"];
    if (requestedPurpose && validPurposes.includes(requestedPurpose)) {
      currentUser.purpose = requestedPurpose;
      await currentUser.save();
    }

    console.log("========== CURRENT USER ==========");

    console.log({
      username: currentUser.username,
      gender: currentUser.gender,
      interestedIn: currentUser.interestedIn,
      purpose: currentUser.purpose,
      department: currentUser.department,
      year: currentUser.year,
      studySubjects: currentUser.studySubjects,
      studyAvailability: currentUser.studyAvailability,
      studyMode: currentUser.studyMode,
      studyStyle: currentUser.studyStyle,
    });

    // ==================================================
    // CHECK IF ALREADY WAITING
    // ==================================================

    const alreadyWaiting = await Queue.findOne({
      user: userId,
    });

    if (alreadyWaiting) {
      console.log("⚠️ User already in queue");

      return res.status(400).json({
        message: "You are already waiting for a match.",
      });
    }

    // ==================================================
    // GET USERS CURRENTLY IN QUEUE
    // ==================================================

    const waitingUsers = await Queue.find({
      user: {
        $ne: userId,
      },
    }).sort({
      createdAt: 1,
    });

    console.log("========== WAITING USERS ==========");

    console.log(
      waitingUsers.map((q) => ({
        user: q.user.toString(),
        gender: q.gender,
        interestedIn: q.interestedIn,
        purpose: q.purpose,
      }))
    );

    // ==================================================
    // FIND COMPATIBLE PARTNER
    // ==================================================

    let matchedQueueUser = null;
    let matchedPartner = null;
    let bestScore = -1;

    for (const queueUser of waitingUsers) {
      const partnerUser = await User.findById(
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
        "🔎 Checking:",
        currentUser.username,
        "<->",
        partnerUser.username
      );

      console.log({
        currentUser: {
          gender: currentUser.gender,
          interestedIn: currentUser.interestedIn,
          purpose: currentUser.purpose,
        },

        partner: {
          gender: partnerUser.gender,
          interestedIn: partnerUser.interestedIn,
          purpose: partnerUser.purpose,
        },
      });

      // ==================================================
      // COMPATIBILITY CHECK
      // ==================================================

      const compatible = areUsersCompatible(
        currentUser,
        partnerUser
      );

      if (!compatible) {
        continue;
      }

      // ==================================================
      // CALCULATE SCORE
      // ==================================================

      const score = getCompatibilityScore(
        currentUser,
        partnerUser
      );

      console.log(
        `🎯 Compatibility with ${partnerUser.username}: ${score}%`
      );

      // ==================================================
      // STUDY BUDDY
      // SELECT BEST MATCH
      // ==================================================

      if (currentUser.purpose === "Study Buddy") {
        if (score > bestScore) {
          bestScore = score;
          matchedQueueUser = queueUser;
          matchedPartner = partnerUser;
        }
      } else {
        // Existing behavior:
        // first compatible person wins
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
      console.log("🎉 MATCH FOUND!");

      console.log(
        currentUser.username,
        "<->",
        matchedPartner.username
      );

      if (currentUser.purpose === "Study Buddy") {
        console.log(
          `📚 Study Buddy Compatibility: ${bestScore}%`
        );
      }

      // =================================================
      // CREATE MATCH
      // =================================================

      const match = await Match.create({
        user1: userId,

        user2: matchedQueueUser.user,

        purpose: currentUser.purpose,

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

      const io = req.app.get("io");

      const user1Socket = connectedUsers.get(
        userId.toString()
      );

      const user2Socket = connectedUsers.get(
        matchedQueueUser.user.toString()
      );

      // =================================================
      // PARTNER DATA
      // =================================================

      const partnerData = {
        username: matchedPartner.username,

        gender: matchedPartner.gender,

        department: matchedPartner.department,

        year: matchedPartner.year,

        profileImage: matchedPartner.profileImage,

        purpose: matchedPartner.purpose,

        bio: matchedPartner.bio,

        interests: matchedPartner.interests || [],

        studySubjects:
          matchedPartner.studySubjects || [],

        studyAvailability:
          matchedPartner.studyAvailability || [],

        studyMode:
          matchedPartner.studyMode || "Both",

        studyStyle:
          matchedPartner.studyStyle || "Both",

        compatibilityScore:
          currentUser.purpose === "Study Buddy"
            ? bestScore
            : null,
      };

      // =================================================
      // NOTIFY USER 1
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
          "📡 Match notification sent to User 1"
        );
      }

      // =================================================
      // NOTIFY USER 2
      // =================================================

      if (user2Socket) {
        const user2Score =
          currentUser.purpose === "Study Buddy"
            ? getStudyBuddyScore(
                matchedPartner,
                currentUser
              )
            : null;

        io.to(user2Socket).emit(
          "matchFound",
          {
            matchId: match._id,

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

              bio:
                currentUser.bio,

              interests:
                currentUser.interests || [],

              studySubjects:
                currentUser.studySubjects || [],

              studyAvailability:
                currentUser.studyAvailability || [],

              studyMode:
                currentUser.studyMode || "Both",

              studyStyle:
                currentUser.studyStyle || "Both",

              compatibilityScore:
                user2Score,
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

        message: "🎉 Match Found!",

        matchId: match._id,

        partner: partnerData,

        compatibilityScore:
          currentUser.purpose === "Study Buddy"
            ? bestScore
            : null,
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

      gender: currentUser.gender,

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
    console.error(
      "❌ Match controller error:",
      err
    );

    return res.status(500).json({
      message: "Server error while finding a match.",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : undefined,
    });
  }
};

// ======================================================
// CANCEL QUEUE
// ======================================================

const cancelQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Queue.deleteOne({
      user: userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "You are not currently waiting for a match.",
      });
    }

    return res.status(200).json({
      message: "Match search cancelled.",
    });
  } catch (err) {
    console.error(
      "❌ Cancel queue error:",
      err
    );

    return res.status(500).json({
      message: "Failed to cancel match search.",
    });
  }
};

// ======================================================
// GET MATCH STATUS
// ======================================================

const getMatchStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const queueEntry = await Queue.findOne({
      user: userId,
    });

    if (queueEntry) {
      return res.status(200).json({
        waiting: true,
        purpose: queueEntry.purpose,
      });
    }

    const match = await Match.findOne({
      $or: [
        {
          user1: userId,
        },
        {
          user2: userId,
        },
      ],
      status: "matched",
    })
      .populate(
        "user1",
        "fullName username department year profileImage bio age gender location interests purpose studySubjects studyAvailability studyMode studyStyle"
      )
      .populate(
        "user2",
        "fullName username department year profileImage bio age gender location interests purpose studySubjects studyAvailability studyMode studyStyle"
      );

    if (!match) {
      return res.status(200).json({
        waiting: false,
        matched: false,
      });
    }

    const partner =
      match.user1._id.toString() === userId.toString()
        ? match.user2
        : match.user1;

    let compatibilityScore = null;

    if (match.purpose === "Study Buddy") {
      const currentUser =
        await User.findById(userId);

      if (currentUser) {
        compatibilityScore =
          getStudyBuddyScore(
            currentUser,
            partner
          );
      }
    }

    return res.status(200).json({
      waiting: false,

      matched: true,

      matchId: match._id,

      purpose: match.purpose,

      partner: {
        fullName: partner.fullName,

        username: partner.username,

        department: partner.department,

        year: partner.year,

        profileImage: partner.profileImage,

        bio: partner.bio,

        age: partner.age,

        gender: partner.gender,

        location: partner.location,

        interests: partner.interests || [],

        purpose: partner.purpose,

        studySubjects:
          partner.studySubjects || [],

        studyAvailability:
          partner.studyAvailability || [],

        studyMode:
          partner.studyMode || "Both",

        studyStyle:
          partner.studyStyle || "Both",

        compatibilityScore,
      },
    });
  } catch (err) {
    console.error(
      "❌ Match status error:",
      err
    );

    return res.status(500).json({
      message: "Failed to get match status.",
    });
  }
};

// ======================================================
// GET USER'S CURRENT MATCH
// ======================================================

const getCurrentMatch = async (req, res) => {
  try {
    const userId = req.user.id;

    const match = await Match.findOne({
      $or: [
        {
          user1: userId,
        },
        {
          user2: userId,
        },
      ],
      status: "matched",
    })
      .populate(
        "user1",
        "fullName username department year profileImage bio age gender location interests purpose studySubjects studyAvailability studyMode studyStyle"
      )
      .populate(
        "user2",
        "fullName username department year profileImage bio age gender location interests purpose studySubjects studyAvailability studyMode studyStyle"
      );

    if (!match) {
      return res.status(404).json({
        message: "No active match found.",
      });
    }

    const partner =
      match.user1._id.toString() === userId.toString()
        ? match.user2
        : match.user1;

    let compatibilityScore = null;

    if (match.purpose === "Study Buddy") {
      const currentUser =
        await User.findById(userId);

      if (currentUser) {
        compatibilityScore =
          getStudyBuddyScore(
            currentUser,
            partner
          );
      }
    }

    return res.status(200).json({
      matchId: match._id,

      purpose: match.purpose,

      partner: {
        fullName: partner.fullName,

        username: partner.username,

        department: partner.department,

        year: partner.year,

        profileImage: partner.profileImage,

        bio: partner.bio,

        age: partner.age,

        gender: partner.gender,

        location: partner.location,

        interests: partner.interests || [],

        purpose: partner.purpose,

        studySubjects:
          partner.studySubjects || [],

        studyAvailability:
          partner.studyAvailability || [],

        studyMode:
          partner.studyMode || "Both",

        studyStyle:
          partner.studyStyle || "Both",

        compatibilityScore,
      },
    });
  } catch (err) {
    console.error(
      "❌ Current match error:",
      err
    );

    return res.status(500).json({
      message: "Failed to get current match.",
    });
  }
};

// ======================================================
// REVEAL IDENTITY
// ======================================================

const revealIdentity = async (req, res) => {
  try {
    const userId = req.user.id;

    const matchId = (req.body && req.body.matchId) || req.params.matchId;

    const match = await Match.findById(
      matchId
    );

    if (!match) {
      return res.status(404).json({
        message: "Match not found.",
      });
    }

    const isUser1 =
      match.user1.toString() ===
      userId.toString();

    const isUser2 =
      match.user2.toString() ===
      userId.toString();

    if (!isUser1 && !isUser2) {
      return res.status(403).json({
        message:
          "You are not allowed to access this match.",
      });
    }

    if (isUser1) {
      match.revealUser1 = true;
    }

    if (isUser2) {
      match.revealUser2 = true;
    }

    if (
      match.revealUser1 &&
      match.revealUser2
    ) {
      match.revealed = true;

      // Automatically create a Friend document if it doesn't already exist
      const existingFriend = await Friend.findOne({
        $or: [
          { user1: match.user1, user2: match.user2 },
          { user1: match.user2, user2: match.user1 },
        ],
      });

      if (!existingFriend) {
        await Friend.create({
          user1: match.user1,
          user2: match.user2,
        });
        console.log("🤝 Added to Friends list upon mutual reveal!");
      }
    }

    await match.save();

    return res.status(200).json({
      message: "Identity reveal updated.",

      revealUser1:
        match.revealUser1,

      revealUser2:
        match.revealUser2,

      revealed:
        match.revealed,
    });
  } catch (err) {
    console.error(
      "❌ Reveal identity error:",
      err
    );

    return res.status(500).json({
      message: "Failed to reveal identity.",
    });
  }
};

// ======================================================
// GET CONNECTION HISTORY
// ======================================================

const getConnectionHistory = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const matches =
      await Match.find({
        $or: [
          {
            user1: userId,
          },
          {
            user2: userId,
          },
        ],
      })
        .sort({
          createdAt: -1,
        })
        .populate(
          "user1",
          "fullName username department year profileImage bio age gender location interests purpose studySubjects studyAvailability studyMode studyStyle"
        )
        .populate(
          "user2",
          "fullName username department year profileImage bio age gender location interests purpose studySubjects studyAvailability studyMode studyStyle"
        );

    const history = matches.map(
      (match) => {
        const partner =
          match.user1._id.toString() ===
          userId.toString()
            ? match.user2
            : match.user1;

        let compatibilityScore = null;

        if (match.purpose === "Study Buddy") {
          const currentUser =
            match.user1._id.toString() ===
            userId.toString()
              ? match.user1
              : match.user2;

          compatibilityScore =
            getStudyBuddyScore(
              currentUser,
              partner
            );
        }

        return {
          matchId: match._id,

          purpose:
            match.purpose,

          status:
            match.status,

          createdAt:
            match.createdAt,

          revealed:
            match.revealed,

          partner: {
            fullName:
              partner.fullName,

            username:
              partner.username,

            department:
              partner.department,

            year:
              partner.year,

            profileImage:
              partner.profileImage,

            bio:
              partner.bio,

            age:
              partner.age,

            gender:
              partner.gender,

            location:
              partner.location,

            interests:
              partner.interests || [],

            purpose:
              partner.purpose,

            studySubjects:
              partner.studySubjects || [],

            studyAvailability:
              partner.studyAvailability || [],

            studyMode:
              partner.studyMode || "Both",

            studyStyle:
              partner.studyStyle || "Both",

            compatibilityScore,
          },
        };
      }
    );

    return res.status(200).json({
      matches: history,
    });
  } catch (err) {
    console.error(
      "❌ Connection history error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to get connection history.",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  joinQueue,
  cancelQueue,
  getMatchStatus,
  getCurrentMatch,
  revealIdentity,
  getConnectionHistory,
  areUsersCompatible,
  getStudyBuddyScore,
};