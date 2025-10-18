const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'soccer_game',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

/**
 * プレイヤーを取得または作成
 */
async function getOrCreatePlayer(name) {
  const client = await pool.connect();
  try {
    // 既存プレイヤーを検索
    let result = await client.query(
      'SELECT * FROM Player WHERE name = $1',
      [name]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // 新規プレイヤーを作成
    result = await client.query(
      'INSERT INTO Player (name, wins, losses, total_matches) VALUES ($1, 0, 0, 0) RETURNING *',
      [name]
    );

    console.log(`✅ New player created: ${name} (ID: ${result.rows[0].id})`);
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * 試合結果を保存
 */
async function saveMatchResult(matchData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { score, players } = matchData;
    const teamAlphaScore = score.alpha || 0;
    const teamBraboScore = score.bravo || 0;

    // 勝者を決定
    let winnerTeam = 'draw';
    if (teamAlphaScore > teamBraboScore) {
      winnerTeam = 'alpha';
    } else if (teamBraboScore > teamAlphaScore) {
      winnerTeam = 'bravo';
    }

    // Matchテーブルに挿入
    const matchResult = await client.query(
      `INSERT INTO "Match" (team_alpha_score, team_brabo_score, winner_team) 
       VALUES ($1, $2, $3) RETURNING id`,
      [teamAlphaScore, teamBraboScore, winnerTeam]
    );

    const matchId = matchResult.rows[0].id;
    console.log(`✅ Match ${matchId} created: Alpha ${teamAlphaScore} - ${teamBraboScore} Bravo (Winner: ${winnerTeam})`);

    // 各プレイヤーの情報を保存
    for (const playerId in players) {
      const player = players[playerId];
      const playerName = player.name || playerId;
      const team = player.team;

      // ✅ 修正: this. を削除
      const dbPlayer = await getOrCreatePlayer(playerName);

      // match_playersテーブルに挿入
      await client.query(
        'INSERT INTO match_players (player_id, match_id, team) VALUES ($1, $2, $3)',
        [dbPlayer.id, matchId, team]
      );

      // プレイヤー統計を更新
      const isWinner = (team === winnerTeam && winnerTeam !== 'draw');
      const isLoser = (team !== winnerTeam && winnerTeam !== 'draw');

      await client.query(
        `UPDATE Player 
         SET wins = wins + $1,
             losses = losses + $2,
             total_matches = total_matches + 1
         WHERE id = $3`,
        [isWinner ? 1 : 0, isLoser ? 1 : 0, dbPlayer.id]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Match result saved successfully (Match ID: ${matchId})`);

    return { matchId, winnerTeam };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ PostgreSQL saveMatchResult error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * プレイヤー統計を取得
 */
async function getPlayerStats(playerName) {
  try {
    const result = await pool.query(
      'SELECT * FROM Player WHERE name = $1',
      [playerName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ PostgreSQL getPlayerStats error:', error);
    throw error;
  }
}

/**
 * プレイヤーランキングを取得
 */
async function getPlayerRankings(limit = 10) {
  try {
    const result = await pool.query(
      'SELECT * FROM player_rankings LIMIT $1',
      [limit]
    );

    return result.rows;
  } catch (error) {
    console.error('❌ PostgreSQL getPlayerRankings error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  getOrCreatePlayer,
  saveMatchResult,
  getPlayerStats,
  getPlayerRankings,
};