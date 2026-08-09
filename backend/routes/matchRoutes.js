const express = require("express");
const router = express.Router();

const {
  joinQueue,
  cancelQueue,
  revealIdentity,
  getMatchStatus,
  getCurrentMatch,
  getConnectionHistory,
} = require("../controllers/matchController");

const authMiddleware = require("../middleware/authMiddleware");

// Join match queue
router.post(
  "/join",
  authMiddleware,
  joinQueue
);

// Cancel match search
router.delete(
  "/cancel",
  authMiddleware,
  cancelQueue
);

// Reveal identity
router.post(
  "/reveal",
  authMiddleware,
  revealIdentity
);

// Match status
router.get(
  "/status",
  authMiddleware,
  getMatchStatus
);

// Current match
router.get(
  "/current",
  authMiddleware,
  getCurrentMatch
);

// Connection history
router.get(
  "/history",
  authMiddleware,
  getConnectionHistory
);

module.exports = router;