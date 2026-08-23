const express = require('express');
const router = express.Router();
const TeaSpot = require('../models/TeaSpot');

// Helper to get the Socket.IO instance
function getIo(req) {
  return req.app.get('io');
}

// GET /api/tea-spots - list all spots (already exists but keep for completeness)
router.get('/', async (req, res) => {
  try {
    const spots = await TeaSpot.find();
    res.json(spots);
  } catch (err) {
    console.error('❌ TeaSpot list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tea-spots/:id - spot details
router.get('/:id', async (req, res) => {
  try {
    const spot = await TeaSpot.findById(req.params.id);
    if (!spot) return res.status(404).json({ message: 'TeaSpot not found' });
    res.json(spot);
  } catch (err) {
    console.error('❌ TeaSpot detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tea-spots/:id/checkin - increment check‑in count
router.post('/:id/checkin', async (req, res) => {
  try {
    const spot = await TeaSpot.findByIdAndUpdate(
      req.params.id,
      { $inc: { checkInCount: 1 } },
      { new: true }
    );
    if (!spot) return res.status(404).json({ message: 'TeaSpot not found' });

    const io = getIo(req);
    io.to(`spot-${spot._id}`).emit('checkInUpdate', { count: spot.checkInCount });
    res.json({ checkInCount: spot.checkInCount });
  } catch (err) {
    console.error('❌ Check‑in error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tea-spots/:id/rate - add a rating (1‑5)
router.post('/:id/rate', async (req, res) => {
  const { rating } = req.body; // expect a number
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Invalid rating' });
  }
  try {
    const spot = await TeaSpot.findById(req.params.id);
    if (!spot) return res.status(404).json({ message: 'TeaSpot not found' });
    spot.rating.push(rating);
    await spot.save();

    const io = getIo(req);
    io.to(`spot-${spot._id}`).emit('ratingUpdate', { rating: spot.rating });
    res.json({ rating: spot.rating });
  } catch (err) {
    console.error('❌ Rating error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tea-spots/:id/messages - placeholder (live via sockets)
router.get('/:id/messages', async (req, res) => {
  // No persistent storage for spot messages yet; return empty array
  res.json([]);
});

// POST /api/tea-spots/:id/messages - broadcast new message via Socket.IO
router.post('/:id/messages', async (req, res) => {
  const { sender, text } = req.body;
  if (!sender || !text) {
    return res.status(400).json({ message: 'Missing sender or text' });
  }
  try {
    const io = getIo(req);
    const message = {
      _id: Date.now().toString(), // temporary id
      sender,
      text,
      createdAt: new Date(),
    };
    io.to(`spot-${req.params.id}`).emit('receiveMessage', message);
    res.json(message);
  } catch (err) {
    console.error('❌ Spot message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
