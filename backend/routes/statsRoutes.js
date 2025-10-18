const express = require('express');
const statsController = require('../controllers/statsController');

const router = express.Router();

router.get('/server', statsController.getServerStats);
router.get('/player/:name', statsController.getPlayerStats);
router.get('/rankings', statsController.getRankings);
router.get('/matches/recent', statsController.getRecentMatches);

module.exports = router;