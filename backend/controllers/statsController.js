const Logger = require('../utils/Logger');
const RoomService = require('../services/RoomService');
const MatchService = require('../services/MatchService');
const GameService = require('../services/GameService');

exports.getServerStats = (req, res, next) => {
  try {
    const stats = RoomService.getStats();
    res.json({
      success: true,
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        ...stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPlayerStats = async (req, res, next) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Player name is required',
      });
    }

    const stats = await MatchService.getPlayerStats(name);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
      });
    }

    const winRate = MatchService.calculateWinRate(stats);

    res.json({
      success: true,
      data: {
        ...stats,
        winRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getRankings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100',
      });
    }

    const rankings = await MatchService.getRankings(limit);

    res.json({
      success: true,
      data: rankings.map((rank, index) => ({
        rank: index + 1,
        ...rank,
        winRate: MatchService.calculateWinRate(rank),
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentMatches = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100',
      });
    }

    const matches = await MatchService.getRecentMatches(limit);

    res.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};