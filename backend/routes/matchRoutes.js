const express = require("express");
const router = express.Router();

const {
  joinQueue,
  cancelQueue,
  revealIdentity,
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

module.exports = router;