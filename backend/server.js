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

// WebSocket（syncService のみ）
syncService(wss);

// ヘルスチェック
app.get("/health", (_, res) => res.status(200).send("OK"));

// サーバー起動
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});