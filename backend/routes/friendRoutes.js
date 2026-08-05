const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getFriends,
} = require("../controllers/friendController");

router.get("/", authMiddleware, getFriends);

module.exports = router;