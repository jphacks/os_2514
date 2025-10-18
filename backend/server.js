require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

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
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  };
})();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// REST ルート
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/stats', statsRoutes);

// ヘルスチェック
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// エラーハンドラ（最後に）
app.use(errorHandler);

let wsManager;
let redisService;

const PORT = ENV.PORT;

// 起動
async function startServer() {
  try {
    // 1) Redis 接続
    Logger.info('Connecting to Redis...');
    redisService = await getRedisService();
    if (redisService.connected) {
      Logger.info('Redis connected successfully');
    } else {
      Logger.warn('Redis connection failed - running without cache');
    }

    // 2) イベント購読
    GameEventSubscriber.subscribe();
    DatabaseSubscriber.subscribe();
    WebSocketSubscriber.subscribe();
    Logger.info('Event subscribers initialized');

    // 3) WebSocket マネージャ初期化
    wsManager = new WebSocketManager(wss);
    Logger.info('WebSocket manager initialized');

    // 3.5) 接続ハンドラ（初期化後に登録）+ Origin チェック
    wss.on('connection', (ws, req) => {
      try {
        const origin = req?.headers?.origin;
        if (hasStar && !isProd) {
          // dev "*" は WS も許可
        } else if (!isAllowedOrigin(origin)) {
          Logger.warn('WS blocked origin', { origin });
          try { ws.close(1008, 'Origin not allowed'); } catch (_) {}
          return;
        }
        wsManager.handleConnection(ws);
      } catch (err) {
        Logger.error('WS connection handler error', { message: err.message });
        try { ws.close(1011, 'Internal error'); } catch (_) {}
      }
    });
    wss.on('error', (err) => {
      Logger.error('WebSocket server error', { message: err.message });
    });

    // 4) HTTP サーバ起動
    server.listen(PORT, () => {
      Logger.info(`Server started on port ${PORT}`);
      console.log(`
╔════════════════════════════════════════╗
║  机上バーチャルサッカー サーバー起動   ║
╚════════════════════════════════════════╝

🎮 Server: http://localhost:${PORT}
⚙️  WebSocket: ws://localhost:${PORT}
📦 Node Env: ${ENV.NODE_ENV}
⏱️  Tick: ${CONSTANTS.TICK_INTERVAL}ms
👥 Max Players: ${CONSTANTS.MAX_PLAYERS_PER_ROOM}
🔴 Redis: ${redisService.connected ? 'Connected' : 'Disconnected'}

✅ Ready
      `);

      // 5) ゲームループ開始
      GameLoopService.start(CONSTANTS.TICK_INTERVAL);
    });

    // グレースフルシャットダウン
    const shutdown = async (signal) => {
      Logger.info(`${signal} received, shutting down...`);
      try { GameLoopService.stop(); } catch (_) {}
      try { await redisService.disconnect(); } catch (_) {}
      try { wss.close(() => Logger.info('WebSocket server closed')); } catch (_) {}
      server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    Logger.error('Server startup failed', { message: error.message });
    process.exit(1);
  }
}

startServer();

module.exports = server;