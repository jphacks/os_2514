const express = require('express');
const PlayerRepository = require('../repositories/PlayerRepository');

const router = express.Router();

router.get('/stats/:name', async (req, res) => {
  try {
    const stats = await PlayerRepository.getStats(req.params.name);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rankings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const rankings = await PlayerRepository.getRankings(limit);
    res.json({ success: true, rankings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;