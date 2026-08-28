const express = require("express");
const router = express.Router();

const {
  joinQueue,
  cancelQueue,
} = require("../controllers/matchController");

const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// JOIN ANONYMOUS CHAT QUEUE
// ======================================================

router.post(
  "/join",
  authMiddleware,
  joinQueue
);

// ======================================================
// CANCEL ANONYMOUS CHAT SEARCH
// ======================================================

router.delete(
  "/cancel",
  authMiddleware,
  cancelQueue
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;