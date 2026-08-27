const DatingProfile = require("../models/DatingProfile");
const DatingInteraction = require("../models/DatingInteraction");
const Match = require("../models/Match");

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

    if (profile) {
      if (bio !== undefined) profile.bio = bio;
      if (gender !== undefined) profile.gender = gender;
      if (interestedIn !== undefined) {
        profile.interestedIn = interestedIn;
      }
      if (interests !== undefined) {
        profile.interests = interests;
      }
      if (photos !== undefined) profile.photos = photos;
      if (prompts !== undefined) profile.prompts = prompts;

      if (mysteryModeEnabled !== undefined) {
        profile.mysteryModeEnabled =
          mysteryModeEnabled;
      }

      await profile.save();

      return res.status(200).json({
        message:
          "Dating profile updated successfully",
        profile,
      });
    }

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

    return res.status(201).json({
      message:
        "Dating profile created successfully",
      profile,
    });
  } catch (error) {
    console.error(
      "CREATE/UPDATE DATING PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to save dating profile",
    });
  }
};

// ==========================================
// GET MY DATING PROFILE
// ==========================================

const getMyDatingProfile = async (req, res) => {
  try {
    const profile =
      await DatingProfile.findOne({
        user: req.user.id,
      }).populate(
        "user",
        "fullName username department year profileImage"
      );

    if (!profile) {
      return res.status(404).json({
        message:
          "Dating profile not found",
      });
    }

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    console.error(
      "GET MY DATING PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch dating profile",
    });
  }
};

// ==========================================
// GET DISCOVER PROFILES
// ==========================================

const getDatingMatches = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const myProfile =
      await DatingProfile.findOne({
        user: currentUserId,
      });

    if (!myProfile) {
      return res.status(400).json({
        message:
          "Create your dating profile first",
      });
    }

    const previousInteractions =
      await DatingInteraction.find({
        fromUser: currentUserId,
      }).select("toUser");

    const excludedUsers =
      previousInteractions.map(
        (interaction) =>
          interaction.toUser
      );

    const profiles =
      await DatingProfile.find({
        user: {
          $ne: currentUserId,
          $nin: excludedUsers,
        },
        isDatingEnabled: true,
        gender: {
          $in:
            myProfile.interestedIn || [],
        },
      })
        .populate(
          "user",
          "fullName username department year profileImage"
        )
        .limit(30);

    const formattedProfiles =
      profiles.map((profile) => ({
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

        photos:
          profile.photos || [],

        bio:
          profile.bio || "",

        interests:
          profile.interests || [],

        prompts:
          profile.prompts || [],

        mysteryModeEnabled:
          profile.mysteryModeEnabled,

        verified: true,
      }));

    return res.status(200).json({
      matches: formattedProfiles,
    });
  } catch (error) {
    console.error(
      "GET DATING MATCHES ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch dating profiles",
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

    await DatingInteraction.findOneAndUpdate(
      {
        fromUser: currentUserId,
        toUser: targetUserId,
      },
      {
        action,
        isMutualMatch: false,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    let isMutualMatch = false;
    let matchId = null;

    if (action === "like") {
      const reverseInteraction =
        await DatingInteraction.findOne({
          fromUser: targetUserId,
          toUser: currentUserId,
          action: "like",
        });

      if (reverseInteraction) {
        isMutualMatch = true;

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

        const currentProfile =
          await DatingProfile.findOne({
            user: currentUserId,
          });

        const targetProfile =
          await DatingProfile.findOne({
            user: targetUserId,
          });

        const shouldUseMysteryMode =
          currentProfile?.mysteryModeEnabled ||
          targetProfile?.mysteryModeEnabled;

        let existingMatch =
          await Match.findOne({
            purpose: "Dating",
            status: "matched",
            $or: [
              {
                user1: currentUserId,
                user2: targetUserId,
              },
              {
                user1: targetUserId,
                user2: currentUserId,
              },
            ],
          });

        if (!existingMatch) {
          existingMatch =
            await Match.create({
              user1: currentUserId,
              user2: targetUserId,
              purpose: "Dating",
              status: "matched",

              revealed:
                shouldUseMysteryMode
                  ? false
                  : true,

              revealUser1:
                shouldUseMysteryMode
                  ? false
                  : true,

              revealUser2:
                shouldUseMysteryMode
                  ? false
                  : true,
            });
        }

        matchId = existingMatch._id;
      }
    }

    return res.status(200).json({
      message:
        isMutualMatch
          ? "It's a match! 💘"
          : action === "like"
          ? "Like saved 💗"
          : "Profile passed",

      action,
      isMutualMatch,
      matchId,
    });
  } catch (error) {
    console.error(
      "DATING INTERACTION ERROR:",
      error
    );

    return res.status(500).json({
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

    const matches =
      await Promise.all(
        interactions.map(
          async (interaction) => {
            const otherUserId =
              interaction.toUser?._id;

            let chatMatch = null;

            if (otherUserId) {
              chatMatch =
                await Match.findOne({
                  purpose: "Dating",
                  status: "matched",
                  $or: [
                    {
                      user1: currentUserId,
                      user2: otherUserId,
                    },
                    {
                      user1: otherUserId,
                      user2: currentUserId,
                    },
                  ],
                });
            }

            const isRevealed =
              chatMatch?.revealed === true;

            return {
              interactionId:
                interaction._id,

              userId:
                interaction.toUser?._id,

              fullName:
                isRevealed
                  ? interaction.toUser?.fullName || ""
                  : "Mystery Match",

              username:
                isRevealed
                  ? interaction.toUser?.username || ""
                  : "",

              department:
                isRevealed
                  ? interaction.toUser?.department || ""
                  : "",

              year:
                isRevealed
                  ? interaction.toUser?.year || ""
                  : "",

              profileImage:
                isRevealed
                  ? interaction.toUser?.profileImage || ""
                  : "",

              matchedAt:
                interaction.updatedAt,

              matchId:
                chatMatch?._id || null,

              mysteryMode:
                !isRevealed,

              revealed:
                isRevealed,

              revealRequested:
                chatMatch
                  ? chatMatch.user1.toString() ===
                    currentUserId.toString()
                    ? chatMatch.revealUser1
                    : chatMatch.revealUser2
                  : false,

              otherUserRevealRequested:
                chatMatch
                  ? chatMatch.user1.toString() ===
                    currentUserId.toString()
                    ? chatMatch.revealUser2
                    : chatMatch.revealUser1
                  : false,
            };
          }
        )
      );

    return res.status(200).json({
      matches,
    });
  } catch (error) {
    console.error(
      "GET MUTUAL DATING MATCHES ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch dating matches",
    });
  }
};

// ==========================================
// REVEAL IDENTITY
// ==========================================

const revealDatingIdentity = async (
  req,
  res
) => {
  try {
    const currentUserId = req.user.id;
    const { matchId } = req.params;

    const match = await Match.findById(
      matchId
    );

    if (!match) {
      return res.status(404).json({
        message: "Match not found",
      });
    }

    if (
      match.purpose !== "Dating" ||
      match.status !== "matched"
    ) {
      return res.status(400).json({
        message:
          "This is not an active dating match",
      });
    }

    const isUser1 =
      match.user1.toString() ===
      currentUserId.toString();

    const isUser2 =
      match.user2.toString() ===
      currentUserId.toString();

    if (!isUser1 && !isUser2) {
      return res.status(403).json({
        message:
          "You are not part of this match",
      });
    }

    if (match.revealed) {
      return res.status(200).json({
        message:
          "Both identities are already revealed",
        revealed: true,
        revealUser1:
          match.revealUser1,
        revealUser2:
          match.revealUser2,
      });
    }

    if (isUser1) {
      match.revealUser1 = true;
    }

    if (isUser2) {
      match.revealUser2 = true;
    }

    if (
      match.revealUser1 &&
      match.revealUser2
    ) {
      match.revealed = true;
    }

    await match.save();

    return res.status(200).json({
      message:
        match.revealed
          ? "Both identities are now revealed!"
          : "Reveal request sent. Waiting for the other person.",

      revealed:
        match.revealed,

      revealUser1:
        match.revealUser1,

      revealUser2:
        match.revealUser2,
    });
  } catch (error) {
    console.error(
      "REVEAL DATING IDENTITY ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to reveal identity",
    });
  }
};

// ==========================================
// GET DATING MATCH STATUS
// ==========================================

const getDatingMatchStatus = async (
  req,
  res
) => {
  try {
    const currentUserId = req.user.id;
    const { matchId } = req.params;

    const match = await Match.findById(
      matchId
    );

    if (!match) {
      return res.status(404).json({
        message: "Match not found",
      });
    }

    const isUser1 =
      match.user1.toString() ===
      currentUserId.toString();

    const isUser2 =
      match.user2.toString() ===
      currentUserId.toString();

    if (!isUser1 && !isUser2) {
      return res.status(403).json({
        message:
          "You are not part of this match",
      });
    }

    return res.status(200).json({
      matchId: match._id,
      revealed: match.revealed,

      revealRequested:
        isUser1
          ? match.revealUser1
          : match.revealUser2,

      otherUserRevealRequested:
        isUser1
          ? match.revealUser2
          : match.revealUser1,
    });
  } catch (error) {
    console.error(
      "GET DATING MATCH STATUS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch match status",
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

    return res.status(200).json({
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

    return res.status(500).json({
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

    return res.status(200).json({
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

    return res.status(500).json({
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
  revealDatingIdentity,
  getDatingMatchStatus,
  toggleDatingProfile,
  toggleMysteryMode,
};