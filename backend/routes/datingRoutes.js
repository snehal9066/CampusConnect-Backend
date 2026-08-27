const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createOrUpdateDatingProfile,
  getMyDatingProfile,
  getDatingMatches,
  interactWithDatingProfile,
  getDatingMutualMatches,
  revealDatingIdentity,
  getDatingMatchStatus,
  toggleDatingProfile,
  toggleMysteryMode,
} = require("../controllers/datingController");

// ==========================================
// DATING PROFILE
// ==========================================

// Create or update dating profile
router.post(
  "/profile",
  authMiddleware,
  createOrUpdateDatingProfile
);

// Get my dating profile
router.get(
  "/profile",
  authMiddleware,
  getMyDatingProfile
);

// ==========================================
// DISCOVER
// ==========================================

// Get profiles for dating discovery
router.get(
  "/discover",
  authMiddleware,
  getDatingMatches
);

// ==========================================
// LIKE / PASS
// ==========================================

// Like or pass a dating profile
router.post(
  "/interact",
  authMiddleware,
  interactWithDatingProfile
);

// ==========================================
// MUTUAL MATCHES
// ==========================================

// Get all mutual dating matches
router.get(
  "/matches",
  authMiddleware,
  getDatingMutualMatches
);

// ==========================================
// DATING MATCH STATUS
// ==========================================

// Get the current status of a dating match
router.get(
  "/match/:matchId/status",
  authMiddleware,
  getDatingMatchStatus
);

// ==========================================
// REVEAL IDENTITY
// ==========================================

// Request / confirm identity reveal for a match
router.post(
  "/match/:matchId/reveal",
  authMiddleware,
  revealDatingIdentity
);

// ==========================================
// SETTINGS
// ==========================================

// Enable / disable dating profile
router.patch(
  "/toggle",
  authMiddleware,
  toggleDatingProfile
);

// Enable / disable Mystery Mode
router.patch(
  "/mystery-mode",
  authMiddleware,
  toggleMysteryMode
);

module.exports = router;