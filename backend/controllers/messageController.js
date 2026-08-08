const Message = require("../models/Message");
const Match = require("../models/Match");

// ======================================================
// GET ALL MESSAGES FOR A MATCH
// ======================================================

const getMessages = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        message: "Match not found",
      });
    }

    // Make sure the logged-in user belongs
    // to this match
    const isParticipant =
      match.user1.toString() ===
        userId.toString() ||
      match.user2.toString() ===
        userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        message:
          "You are not allowed to access this chat.",
      });
    }

    // Get messages
    const messages = await Message.find({
      match: matchId,
    })
      .populate(
        "sender",
        "username fullName profileImage"
      )
      .sort({
        createdAt: 1,
      });

    return res.status(200).json(
      messages
    );
  } catch (err) {
    console.log(
      "GET MESSAGES ERROR:"
    );

    console.log(err);

    return res.status(500).json({
      message:
        err.message ||
        "Unable to load messages.",
    });
  }
};

module.exports = {
  getMessages,
};