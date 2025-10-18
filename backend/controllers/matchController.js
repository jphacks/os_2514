const dbService = require("../services/dbService");

/**
 * 試合結果を保存
 */
exports.saveMatchResult = async (req, res) => {
  try {
    const matchData = req.body;
    
    if (!matchData.score || !matchData.players) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: score and players" 
      });
    }
    
    console.log("Saving match data:", matchData);
    
    const result = await dbService.saveMatchResult(matchData);
    
    res.json({ 
      success: true, 
      matchId: result.matchId 
    });
    
  } catch (error) {
    console.error("Error saving match result:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * 最近の試合結果を取得
 */
exports.getRecentMatches = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const matches = await dbService.getRecentMatches(limit);
    
    res.json({ 
      success: true, 
      matches 
    });
    
  } catch (error) {
    console.error("Error getting recent matches:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * プレイヤー統計を取得
 */
exports.getPlayerStats = async (req, res) => {
  try {
    const playerName = req.params.name;
    
    if (!playerName) {
      return res.status(400).json({ 
        success: false, 
        error: "Player name is required" 
      });
    }
    
    const stats = await dbService.getPlayerStats(playerName);
    
    if (!stats) {
      return res.status(404).json({ 
        success: false, 
        error: "Player not found" 
      });
    }
    
    res.json({ 
      success: true, 
      stats 
    });
    
  } catch (error) {
    console.error("Error getting player stats:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * プレイヤーのマッチ履歴を取得
 */
exports.getPlayerMatchHistory = async (req, res) => {
  try {
    const playerName = req.params.name;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!playerName) {
      return res.status(400).json({ 
        success: false, 
        error: "Player name is required" 
      });
    }
    
    const history = await dbService.getPlayerMatchHistory(playerName, limit);
    
    res.json({ 
      success: true, 
      history 
    });
    
  } catch (error) {
    console.error("Error getting player match history:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * ランキングを取得
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await dbService.getLeaderboard(limit);
    
    res.json({ 
      success: true, 
      leaderboard 
    });
    
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * 全プレイヤーの統計を取得
 */
exports.getAllPlayersStats = async (req, res) => {
  try {
    const players = await dbService.getAllPlayersStats();
    
    res.json({ 
      success: true, 
      players 
    });
    
  } catch (error) {
    console.error("Error getting all players stats:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};