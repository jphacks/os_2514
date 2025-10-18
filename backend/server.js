require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/stats', statsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

let wsManager;
let redisService;

app.use(errorHandler);

const PORT = ENV.PORT;

async function startServer() {
  try {
    // 1. Redis接続
    Logger.info('Connecting to Redis...');
    redisService = await getRedisService();
    
    if (redisService.connected) {
      Logger.info('Redis connected successfully');
    } else {
      Logger.warn('Redis connection failed - running without cache');
    }

    // 2. イベント購読設定
    GameEventSubscriber.subscribe();
    DatabaseSubscriber.subscribe();
    WebSocketSubscriber.subscribe();
    Logger.info('Event subscribers initialized');

    // 3. WebSocketマネージャー
    wsManager = new WebSocketManager(wss);
    Logger.info('WebSocket manager initialized');

    // 3.5 WebSocket接続ハンドラ（wsManager 初期化後に登録）
    wss.on('connection', (ws) => {
      try {
        wsManager.handleConnection(ws);
      } catch (err) {
        Logger.error('WS connection handler error', { message: err.message });
        try { ws.close(1011, 'Internal error'); } catch (_) {}
      }
    });
    wss.on('error', (err) => {
      Logger.error('WebSocket server error', { message: err.message });
    });

    // 4. サーバー起動
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

      // 5. ゲームループ開始
      GameLoopService.start(CONSTANTS.TICK_INTERVAL);
    });

    // グレースフルシャットダウン
    process.on('SIGTERM', async () => {
      Logger.info('SIGTERM received, shutting down...');
      GameLoopService.stop();
      try { await redisService.disconnect(); } catch (_) {}
      wss.close(() => Logger.info('WebSocket server closed'));
      server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    Logger.error('Server startup failed', { message: error.message });
    process.exit(1);
  }
}

startServer();

module.exports = server;