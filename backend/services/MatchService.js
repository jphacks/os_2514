const Logger = require('../utils/Logger');
const MatchRepository = require('../repositories/MatchRepository');
const PlayerRepository = require('../repositories/PlayerRepository');

class MatchService {
  async saveMatchResult(room) {
    try {
      Logger.info('Saving match result', {
        roomId: room.roomId,
        score: room.score,
        playerCount: room.getPlayerCount(),
      });

      const result = await MatchRepository.save({
        score: room.score,
        players: room.players,
      });

      Logger.info('Match result saved', {
        matchId: result.matchId,
        winner: result.winnerTeam,
      });

      return result;
    } catch (error) {
      Logger.error('Failed to save match result', {
        roomId: room.roomId,
        error: error.message,
      });
      throw error;
    }
  }

  async getPlayerStats(playerName) {
    try {
      const stats = await PlayerRepository.getStats(playerName);
      return stats;
    } catch (error) {
      Logger.error('Failed to get player stats', {
        playerName,
        error: error.message,
      });
      throw error;
    }
  }

  async getRankings(limit = 10) {
    try {
      const rankings = await PlayerRepository.getRankings(limit);
      return rankings;
    } catch (error) {
      Logger.error('Failed to get rankings', {
        error: error.message,
      });
      throw error;
    }
  }

  async getRecentMatches(limit = 10) {
    try {
      const matches = await MatchRepository.getRecentMatches(limit);
      return matches;
    } catch (error) {
      Logger.error('Failed to get recent matches', {
        error: error.message,
      });
      throw error;
    }
  }

  calculateWinRate(stats) {
    if (stats.total_matches === 0) return 0;
    return ((stats.wins / stats.total_matches) * 100).toFixed(2);
  }
}

module.exports = new MatchService();