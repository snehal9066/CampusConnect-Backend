const express = require("express");
const router = express.Router();

const {
  joinQueue,
  revealIdentity,
} = require("../controllers/matchController");

const authMiddleware = require("../middleware/authMiddleware");

// Join queue
router.post("/join", authMiddleware, joinQueue);

// Reveal identity
router.post("/reveal", authMiddleware, revealIdentity);

module.exports = router;