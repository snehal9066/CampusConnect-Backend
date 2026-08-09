const Friend = require("../models/Friend");
const Match = require("../models/Match");

// ======================================================
// GET ALL FRIENDS OF LOGGED-IN USER
// ======================================================

const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friends = await Friend.find({
      $or: [
        { user1: userId },
        { user2: userId },
      ],
    })
      .populate(
        "user1 user2",
        "fullName username department year profileImage bio age gender location interests purpose"
      )
      .lean();

    const friendList = [];

    for (const friend of friends) {
      if (!friend.user1 || !friend.user2) {
        continue;
      }

      // Find the other user
      const friendUser =
        friend.user1._id.toString() ===
        userId.toString()
          ? friend.user2
          : friend.user1;

      // Find the revealed match between both users
      const match = await Match.findOne({
        $or: [
          {
            user1: userId,
            user2: friendUser._id,
          },
          {
            user1: friendUser._id,
            user2: userId,
          },
        ],
        revealed: true,
      })
        .sort({ createdAt: -1 })
        .lean();

      friendList.push({
        ...friendUser,

        // Existing match ID
        matchId: match
          ? match._id
          : null,

        // Purpose of the connection
        purpose:
          match?.purpose ||
          friendUser.purpose ||
          "Friendship",

        // Friendship information
        friendshipId: friend._id,

        friendsSince: friend.createdAt,
      });
    }

    console.log(
      "========== FRIENDS =========="
    );

    console.log(friendList);

    return res.status(200).json(
      friendList
    );
  } catch (err) {
    console.log(
      "========== GET FRIENDS ERROR =========="
    );

    console.log(err);

    return res.status(500).json({
      message:
        err.message ||
        "Unable to load friends.",
    });
  }
};

module.exports = {
  getFriends,
};