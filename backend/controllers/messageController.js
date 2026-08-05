const Message = require("../models/Message");

// Get all messages for a match
const getMessages = async (req, res) => {
  try {
    const { matchId } = req.params;

    const messages = await Message.find({
      match: matchId,
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  getMessages,
};