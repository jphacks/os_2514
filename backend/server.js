require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const routes = require("./routes");
const syncService = require("./services/syncService");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ミドルウェア
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", routes);

// WebSocket
syncService(wss);

// 統計情報エンドポイント
app.get("/api/stats", (_, res) => {
  const stats = syncService.getRoomStats();
  res.json(stats);
});

// マッチング設定エンドポイント（開発用）
app.post("/api/config/max-players", (req, res) => {
  const { maxPlayers } = req.body;
  if (typeof maxPlayers !== 'number' || maxPlayers < 2) {
    return res.status(400).json({ error: "maxPlayers must be a number >= 2" });
  }
  
  const success = syncService.setMaxPlayersPerRoom(maxPlayers);
  if (success) {
    res.json({ success: true, maxPlayers });
  } else {
    res.status(400).json({ error: "Cannot change max players while games are running" });
  }
});

// ヘルスチェック
app.get("/health", (_, res) => res.status(200).send("OK"));

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
  console.log(`Max players per room: ${process.env.MAX_PLAYERS_PER_ROOM || 6}`);
});