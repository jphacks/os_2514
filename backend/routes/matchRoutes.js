const express = require('express');
const MatchRepository = require('../repositories/MatchRepository');

const router = express.Router();

router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const matches = await MatchRepository.getRecentMatches(limit);
    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;