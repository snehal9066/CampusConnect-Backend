const express = require("express");
const router = express.Router();

const { getMessages } = require("../controllers/messageController");

// Get all messages for a match
router.get("/:matchId", getMessages);

module.exports = router;