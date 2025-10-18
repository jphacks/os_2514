const pool = require('./DatabasePool');

class PlayerRepository {
  async getOrCreate(name) {
    const client = await pool.connect();
    try {
      let result = await client.query(
        'SELECT * FROM Player WHERE name = $1',
        [name]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      result = await client.query(
        'INSERT INTO Player (name, wins, losses, total_matches) VALUES ($1, 0, 0, 0) RETURNING *',
        [name]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getStats(name) {
    const result = await pool.query(
      'SELECT * FROM Player WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  async getRankings(limit = 10) {
    const result = await pool.query(
      'SELECT * FROM player_rankings LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}

module.exports = new PlayerRepository();