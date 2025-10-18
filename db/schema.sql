-- Soccer Game Database Schema

-- Player テーブル
CREATE TABLE IF NOT EXISTS Player (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match テーブル
CREATE TABLE IF NOT EXISTS "Match" (
    id SERIAL PRIMARY KEY,
    team_alpha_score INTEGER NOT NULL,
    team_brabo_score INTEGER NOT NULL,
    winner_team VARCHAR(10) NOT NULL CHECK (winner_team IN ('alpha', 'bravo', 'draw')),
    match_end_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- match_players テーブル（多対多の中間テーブル）
CREATE TABLE IF NOT EXISTS match_players (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES Player(id) ON DELETE CASCADE,
    match_id INTEGER REFERENCES "Match"(id) ON DELETE CASCADE,
    team VARCHAR(10) NOT NULL CHECK (team IN ('alpha', 'bravo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, match_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_player_name ON Player(name);
CREATE INDEX IF NOT EXISTS idx_player_wins ON Player(wins DESC);
CREATE INDEX IF NOT EXISTS idx_match_end_time ON "Match"(match_end_time DESC);
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);

-- ビュー: プレイヤーランキング
CREATE OR REPLACE VIEW player_rankings AS
SELECT 
    id,
    name,
    wins,
    losses,
    total_matches,
    CASE 
        WHEN total_matches = 0 THEN 0 
        ELSE ROUND((wins::DECIMAL / total_matches) * 100, 2) 
    END as win_rate
FROM Player
ORDER BY wins DESC, win_rate DESC;
