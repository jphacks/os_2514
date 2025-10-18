// DB: PostgreSQL接続用（実装時に追加）
// const dbService = require("../services/dbService");

exports.saveMatchResult = (req, res) => {
  const matchData = req.body;
  
  console.log("Saving match data:", matchData);
  
  // DB: ここでpostgresqlに保存
  res.json({ success: true });
};