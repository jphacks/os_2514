const express = require('express');
const router = express.Router();

// 統計情報エンドポイント
router.get("/stats", (req, res) => {
  // DB: Redis実装時に適切な統計情報を取得
  res.json({
    message: "Stats endpoint - to be implemented with DB/Redis"
  });
});

// ヘルスチェック
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

module.exports = router;