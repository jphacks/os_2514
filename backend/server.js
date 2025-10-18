const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');


try {
  require("dotenv").config();
  const express = require('express');
  const http = require('http');
  const path = require('path');
  const WebSocket = require('ws');
  // ...既存の require 群...
  // Boot log for Cloud Run startup troubleshooting
  console.log("[BOOT] Starting backend...", {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
  });
} catch (err) {
  console.error('[FATAL] Require failed:', err);
  process.exit(1);
}

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
});

const ENV = require('./config/environment');
const CONSTANTS = require('./config/constants');
const GameLoopService = require('./services/GameLoopService');
const WebSocketManager = require('./websocket/WebSocketManager');
const { getRedisService } = require('./services/RedisService');
const Logger = require('./utils/Logger');
const GameEventSubscriber = require('./events/subscribers/GameEventSubscriber');
const DatabaseSubscriber = require('./events/subscribers/DatabaseSubscriber');
const WebSocketSubscriber = require('./events/subscribers/WebSocketSubscriber');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { errorHandler } = require('./utils/ErrorHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// CORS 設定（明示ホワイトリスト推奨）
const isProd = ENV.NODE_ENV === 'production';
const configured = (ENV.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const devDefaults = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
const hasStar = configured.includes('*');
const allowedList = configured.length ? configured : (isProd ? [] : devDefaults);

// 簡易ワイルドカード対応（例: *.example.com）
const patterns = allowedList
  .filter(o => o.startsWith('*.'))
  .map(o => new RegExp(`^https?://([^.]+\\.)?${o.slice(2).replace(/\./g, '\\.')}(?::\\d+)?$`));
const exacts = new Set(allowedList.filter(o => !o.startsWith('*.')));

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin/curl
  if (exacts.has(origin)) return true;
  return patterns.some(re => re.test(origin));
}

const corsOptions = (() => {
  if (hasStar && !isProd) {
    // 開発: 全許可（資格情報は付けない）
    Logger.warn('CORS: development mode with "*" (credentials disabled)');
    return { origin: true, credentials: false };
  }
  if (isProd && (hasStar || allowedList.length === 0)) {
    Logger.warn('CORS: no explicit origins in production; cross-origin requests will be rejected');
  }
  return {
    origin(origin, cb) {
      const ok = isAllowedOrigin(origin);
      if (!ok) {
        Logger.warn('CORS blocked origin', { origin });
        return cb(new Error('Not allowed by CORS'));
      }
      return cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
})();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// サーバー起動（Cloud RunはPORT=8080、0.0.0.0での待受けが必要）
const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}/`);
  console.log(`Max players per room: ${process.env.MAX_PLAYERS_PER_ROOM || 6}`);
});
