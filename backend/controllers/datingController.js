const DatingProfile = require("../models/DatingProfile");
const DatingInteraction = require("../models/DatingInteraction");

// ==========================================
// CREATE OR UPDATE DATING PROFILE
// ==========================================

const createOrUpdateDatingProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      bio,
      gender,
      interestedIn,
      interests,
      photos,
      prompts,
      mysteryModeEnabled,
    } = req.body;

    let profile = await DatingProfile.findOne({
      user: userId,
    });

    // UPDATE EXISTING PROFILE
    if (profile) {
      if (bio !== undefined) {
        profile.bio = bio;
      }

      if (gender !== undefined) {
        profile.gender = gender;
      }

      if (interestedIn !== undefined) {
        profile.interestedIn = interestedIn;
      }

      if (interests !== undefined) {
        profile.interests = interests;
      }

      if (photos !== undefined) {
        profile.photos = photos;
      }

      if (prompts !== undefined) {
        profile.prompts = prompts;
      }

      if (mysteryModeEnabled !== undefined) {
        profile.mysteryModeEnabled = mysteryModeEnabled;
      }

      await profile.save();

      return res.status(200).json({
        message: "Dating profile updated successfully",
        profile,
      });
    }

    // CREATE NEW PROFILE
    profile = await DatingProfile.create({
      user: userId,
      bio: bio || "",
      gender,
      interestedIn: interestedIn || [],
      interests: interests || [],
      photos: photos || [],
      prompts: prompts || [],
      mysteryModeEnabled:
        mysteryModeEnabled !== undefined
          ? mysteryModeEnabled
          : true,
    });

    res.status(201).json({
      message: "Dating profile created successfully",
      profile,
    });
  } catch (error) {
    console.error(
      "CREATE/UPDATE DATING PROFILE ERROR:",
      error
    );

    res.status(500).json({
      message: "Failed to save dating profile",
    });
  }
};


// ==========================================
// GET MY DATING PROFILE
// ==========================================

const getMyDatingProfile = async (req, res) => {
  try {
    const profile = await DatingProfile.findOne({
      user: req.user.id,
    }).populate(
      "user",
      "fullName username department year profileImage"
    );

    if (!profile) {
      return res.status(404).json({
        message: "Dating profile not found",
      });
    }

    res.status(200).json({
      profile,
    });
  } catch (error) {
    console.error(
      "GET MY DATING PROFILE ERROR:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch dating profile",
    });
  }
};


// ==========================================
// GET DISCOVER PROFILES
// TEMPORARILY SHOW ALL ENABLED USERS
// ==========================================

const getDatingMatches = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const myProfile = await DatingProfile.findOne({
      user: currentUserId,
    });

    if (!myProfile) {
      return res.status(400).json({
        message: "Create your dating profile first",
      });
    }

    // Find profiles already liked or passed
    const previousInteractions =
      await DatingInteraction.find({
        fromUser: currentUserId,
      }).select("toUser");

    const excludedUsers = previousInteractions.map(
      (interaction) => interaction.toUser
    );

    // TEMPORARY:
    // Show every other enabled dating profile.
    // Gender/interestedIn filtering will be added later.
    const profiles = await DatingProfile.find({
      user: {
        $ne: currentUserId,
        $nin: excludedUsers,
      },

      isDatingEnabled: true,
    })
      .populate(
        "user",
        "fullName username department year profileImage"
      )
      .limit(30);

    const formattedProfiles = profiles.map(
      (profile) => ({
        _id: profile._id,

        userId: profile.user?._id,

        fullName:
          profile.user?.fullName || "",

        username:
          profile.user?.username || "",

        department:
          profile.user?.department || "",

        year:
          profile.user?.year || "",

        profileImage:
          profile.photos?.[0] ||
          profile.user?.profileImage ||
          "",

        photos: profile.photos || [],

        bio: profile.bio || "",

        interests:
          profile.interests || [],

        prompts:
          profile.prompts || [],

        mysteryModeEnabled:
          profile.mysteryModeEnabled,

        verified: true,
      })
    );

    res.status(200).json({
      matches: formattedProfiles,
    });
  } catch (error) {
    console.error(
      "GET DATING MATCHES ERROR:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch dating profiles",
    });
  }
};


// ==========================================
// LIKE OR PASS A PROFILE
// ==========================================

const interactWithDatingProfile = async (
  req,
  res
) => {
  try {
    const currentUserId = req.user.id;

    const {
      targetUserId,
      action,
    } = req.body;

    if (
      !targetUserId ||
      !["like", "pass"].includes(action)
    ) {
      return res.status(400).json({
        message:
          "Valid target user and action are required",
      });
    }

    if (
      targetUserId.toString() ===
      currentUserId.toString()
    ) {
      return res.status(400).json({
        message:
          "You cannot interact with yourself",
      });
    }

    // Save or update interaction
    await DatingInteraction.findOneAndUpdate(
      {
        fromUser: currentUserId,
        toUser: targetUserId,
      },
      {
        action,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    let isMutualMatch = false;

    // Check for mutual like
    if (action === "like") {
      const reverseInteraction =
        await DatingInteraction.findOne({
          fromUser: targetUserId,
          toUser: currentUserId,
          action: "like",
        });

      if (reverseInteraction) {
        isMutualMatch = true;

        // Mark both interactions as mutual
        await DatingInteraction.updateMany(
          {
            $or: [
              {
                fromUser: currentUserId,
                toUser: targetUserId,
              },
              {
                fromUser: targetUserId,
                toUser: currentUserId,
              },
            ],
          },
          {
            isMutualMatch: true,
          }
        );
      }
    }

    res.status(200).json({
      message: isMutualMatch
        ? "It's a match! 💘"
        : action === "like"
        ? "Like saved ❤️"
        : "Profile passed",

      action,
      isMutualMatch,
    });
  } catch (error) {
    console.error(
      "DATING INTERACTION ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to save dating interaction",
    });
  }
};


// ==========================================
// GET MUTUAL DATING MATCHES
// ==========================================

const getDatingMutualMatches = async (
  req,
  res
) => {
  try {
    const currentUserId = req.user.id;

    const interactions =
      await DatingInteraction.find({
        fromUser: currentUserId,
        action: "like",
        isMutualMatch: true,
      }).populate(
        "toUser",
        "fullName username department year profileImage"
      );

    const matches = interactions.map(
      (interaction) => ({
        interactionId:
          interaction._id,

        userId:
          interaction.toUser?._id,

        fullName:
          interaction.toUser?.fullName || "",

        username:
          interaction.toUser?.username || "",

        department:
          interaction.toUser?.department || "",

        year:
          interaction.toUser?.year || "",

        profileImage:
          interaction.toUser?.profileImage || "",

        matchedAt:
          interaction.updatedAt,
      })
    );

    res.status(200).json({
      matches,
    });
  } catch (error) {
    console.error(
      "GET MUTUAL DATING MATCHES ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch dating matches",
    });
  }
};


// ==========================================
// TOGGLE DATING VISIBILITY
// ==========================================

const toggleDatingProfile = async (
  req,
  res
) => {
  try {
    const profile =
      await DatingProfile.findOne({
        user: req.user.id,
      });

    if (!profile) {
      return res.status(404).json({
        message:
          "Dating profile not found",
      });
    }

    profile.isDatingEnabled =
      !profile.isDatingEnabled;

    await profile.save();

    res.status(200).json({
      message:
        profile.isDatingEnabled
          ? "Dating profile is now visible"
          : "Dating profile is now hidden",

      isDatingEnabled:
        profile.isDatingEnabled,
    });
  } catch (error) {
    console.error(
      "TOGGLE DATING PROFILE ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update dating visibility",
    });
  }
};


// ==========================================
// TOGGLE MYSTERY MODE
// ==========================================

const toggleMysteryMode = async (
  req,
  res
) => {
  try {
    const profile =
      await DatingProfile.findOne({
        user: req.user.id,
      });

    if (!profile) {
      return res.status(404).json({
        message:
          "Dating profile not found",
      });
    }

    profile.mysteryModeEnabled =
      !profile.mysteryModeEnabled;

    await profile.save();

    res.status(200).json({
      message:
        profile.mysteryModeEnabled
          ? "Mystery Mode enabled"
          : "Mystery Mode disabled",

      mysteryModeEnabled:
        profile.mysteryModeEnabled,
    });
  } catch (error) {
    console.error(
      "TOGGLE MYSTERY MODE ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update Mystery Mode",
    });
  }
};


module.exports = {
  createOrUpdateDatingProfile,
  getMyDatingProfile,
  getDatingMatches,
  interactWithDatingProfile,
  getDatingMutualMatches,
  toggleDatingProfile,
  toggleMysteryMode,
};