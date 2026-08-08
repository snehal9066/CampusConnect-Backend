const Match = require("../models/Match");
const Message = require("../models/Message");
const Friend = require("../models/Friend");

// ======================================================
// GET DASHBOARD DATA
// ======================================================

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // --------------------------------------------------
    // 1. MATCH COUNT
    // --------------------------------------------------

    const matchCount = await Match.countDocuments({
      $or: [
        { user1: userId },
        { user2: userId },
      ],
      status: {
        $in: ["pending", "matched"],
      },
    });

    // --------------------------------------------------
    // 2. FRIEND COUNT
    // --------------------------------------------------

    const friendCount =
      await Friend.countDocuments({
        $or: [
          { user1: userId },
          { user2: userId },
        ],
      });

    // --------------------------------------------------
    // 3. CHAT COUNT
    //
    // Count matches where this user has
    // actually sent or received messages.
    // --------------------------------------------------

    const userMatches =
      await Match.find({
        $or: [
          { user1: userId },
          { user2: userId },
        ],
      }).select("_id");

    const matchIds =
      userMatches.map(
        (match) => match._id
      );

    const chatMatchIds =
      await Message.distinct(
        "match",
        {
          match: {
            $in: matchIds,
          },
        }
      );

    const chatCount =
      chatMatchIds.length;

    // --------------------------------------------------
    // 4. RECENT MESSAGES
    // --------------------------------------------------

    const recentMessages =
      await Message.find({
        match: {
          $in: matchIds,
        },
      })
        .populate(
          "sender",
          "username fullName profileImage"
        )
        .populate(
          "match",
          "user1 user2 purpose status"
        )
        .sort({
          createdAt: -1,
        })
        .limit(10);

    // --------------------------------------------------
    // 5. FORMAT RECENT CHATS
    // --------------------------------------------------

    const recentChats =
      recentMessages.map(
        (message) => {
          const match =
            message.match;

          if (!match) {
            return null;
          }

          const partnerId =
            match.user1.toString() ===
            userId.toString()
              ? match.user2
              : match.user1;

          return {
            messageId:
              message._id,

            matchId:
              match._id,

            partnerId,

            sender:
              message.sender,

            text:
              message.text,

            purpose:
              match.purpose,

            createdAt:
              message.createdAt,
          };
        }
      ).filter(Boolean);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      matches: matchCount,
      chats: chatCount,
      friends: friendCount,
      recentChats,
    });

  } catch (error) {
    console.error(
      "DASHBOARD ERROR:"
    );

    console.error(error);

    return res.status(500).json({
      message:
        error.message ||
        "Unable to load dashboard data.",
    });
  }
};

module.exports = {
  getDashboard,
};