const pool = require('./DatabasePool');
const PlayerRepository = require('./PlayerRepository');

class MatchRepository {
  async save(matchData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { score, players } = matchData;
      const teamAlphaScore = score.alpha || 0;
      const teamBravoScore = score.bravo || 0;

      let winnerTeam = 'draw';
      if (teamAlphaScore > teamBravoScore) winnerTeam = 'alpha';
      else if (teamBravoScore > teamAlphaScore) winnerTeam = 'bravo';

      const matchResult = await client.query(
        `INSERT INTO "Match" (team_alpha_score, team_brabo_score, winner_team)
         VALUES ($1, $2, $3) RETURNING id`,
        [teamAlphaScore, teamBravoScore, winnerTeam]
      );

      const matchId = matchResult.rows[0].id;

      for (const playerId in players) {
        const player = players[playerId];
        const playerName = player.name || playerId;
        const team = player.team;

        const dbPlayer = await PlayerRepository.getOrCreate(playerName);

        await client.query(
          'INSERT INTO match_players (player_id, match_id, team) VALUES ($1, $2, $3)',
          [dbPlayer.id, matchId, team]
        );

        const isWinner = team === winnerTeam && winnerTeam !== 'draw';
        const isLoser = team !== winnerTeam && winnerTeam !== 'draw';

        await client.query(
          `UPDATE Player SET wins = wins + $1, losses = losses + $2, total_matches = total_matches + 1
           WHERE id = $3`,
          [isWinner ? 1 : 0, isLoser ? 1 : 0, dbPlayer.id]
        );
      }

      await client.query('COMMIT');
      return { matchId, winnerTeam };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getRecentMatches(limit = 10) {
    const result = await pool.query(
      'SELECT * FROM "Match" ORDER BY match_end_time DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}

module.exports = new MatchRepository();