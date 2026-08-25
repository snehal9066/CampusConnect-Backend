const express = require("express");
const router = express.Router();

const TeaSpot = require("../models/TeaSpot");
const authMiddleware = require("../middleware/authMiddleware");

// GET all tea spots
router.get("/", async (req, res) => {
  try {
    const spots = await TeaSpot.find()
      .populate("createdBy", "fullName username")
      .sort({ createdAt: -1 });

    res.status(200).json(spots);
  } catch (error) {
    console.error("Error fetching tea spots:", error);

    res.status(500).json({
      message: "Failed to fetch tea spots",
    });
  }
});

// GET single tea spot
router.get("/:id", async (req, res) => {
  try {
    const spot = await TeaSpot.findById(req.params.id).populate(
      "createdBy",
      "fullName username"
    );

    if (!spot) {
      return res.status(404).json({
        message: "Tea spot not found",
      });
    }

    res.status(200).json(spot);
  } catch (error) {
    console.error("Error fetching tea spot:", error);

    res.status(500).json({
      message: "Failed to fetch tea spot",
    });
  }
});

// CREATE a new tea spot
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      imageUrl,
      lat,
      lng,
    } = req.body;

    if (!name || !lat || !lng) {
      return res.status(400).json({
        message: "Name, latitude and longitude are required",
      });
    }

    const newSpot = await TeaSpot.create({
      name,
      description,
      imageUrl,
      lat: Number(lat),
      lng: Number(lng),

      // Comes from JWT
      createdBy: req.user.id || req.user._id,
    });

    res.status(201).json(newSpot);
  } catch (error) {
    console.error("Error creating tea spot:", error);

    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

module.exports = router;