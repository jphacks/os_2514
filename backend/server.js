require("dotenv").config();
// Boot log for Cloud Run startup troubleshooting
console.log("[BOOT] Starting backend...", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
});

const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const routes = require("./routes");
const syncService = require("./services/syncService");

const app = express();
// CORS設定: 必要に応じてオリジンを指定
app.use(cors({
  origin: ["http://localhost:8080", "http://127.0.0.1:8080"], // フロントのURL
  credentials: true
}));
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

// サーバー起動（Cloud RunはPORT=8080、0.0.0.0での待受けが必要）
const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}/`);
  console.log(`Max players per room: ${process.env.MAX_PLAYERS_PER_ROOM || 6}`);
});