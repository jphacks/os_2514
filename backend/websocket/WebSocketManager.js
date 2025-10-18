const WebSocket = require('ws');
const MessageParser = require('./MessageParser');
const RoomService = require('../services/RoomService');
const ActionService = require('../services/ActionService');
const GameLoopService = require('../services/GameLoopService');
const MatchRepository = require('../repositories/MatchRepository');
const Logger = require('../utils/Logger');
const eventEmitter = require('../events/EventEmitter');
const EVENTS = require('../events/events');
const CONSTANTS = require('../config/constants');

class WebSocketManager {
  constructor(wss) {
    this.wss = wss;
    this.connections = new Map();
    this._lastUpdateAt = new WeakMap(); // 追加: レート制限用
    this._setupEventListeners();
  }

  handleConnection(ws) {
    Logger.info('WebSocket client connected');
    ws.playerId = null;
    ws.roomId = null;

    ws.on('message', (message) => {
      this._handleMessage(ws, message).catch(err => {
        Logger.error('WebSocket message error', { error: err.message, stack: err.stack });
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Internal server error' },
        }));
      });
    });

    ws.on('close', () => {
      this._handleClose(ws).catch(err => {
        Logger.error('WebSocket close error', { error: err.message });
      });
    });

    ws.on('error', (error) => {
      Logger.error('WebSocket error', { error: error.message });
    });
  }

  async _handleMessage(ws, message) {
    const data = MessageParser.parse(message);
    MessageParser.validate(data);

    const { type, payload } = data;

    switch (type) {
      case 'join':
        return this._handleJoin(ws, payload);
      case 'createRoom':
        return this._handleCreateRoom(ws, payload);
      case 'joinRoom':
        return this._handleJoinRoom(ws, payload);
      case 'update':
        return await this._handleUpdate(ws, payload);
      case 'action':
        return this._handleAction(ws, payload);
      case 'control':
        return await this._handleControl(ws, payload);
      case 'leave':
        return await this._handleLeave(ws);
      default:
        Logger.warn('Unknown message type', { type });
    }
  }

  _handleJoin(ws, payload) {
    const playerId = `p_${Math.floor(Math.random() * 10000)}`;
    ws.playerId = playerId;

    const room = RoomService.joinRandomMatch(playerId, payload?.name || 'Unknown');
    ws.roomId = room.roomId;
    GameLoopService.registerRoom(room);

    ws.send(JSON.stringify({
      type: 'joinAck',
      payload: {
        playerId,
        ...room.toJSON(),
      },
    }));

    Logger.info('Player joined', { playerId, roomId: room.roomId, playerCount: room.getPlayerCount() });

    // 全クライアントに通知
    this._broadcastToRoom(room.roomId, {
      type: 'playerJoined',
      payload: room.toJSON(),
    });

    // ルームが満員の場合、マッチング開始
    if (room.isFull()) {
      Logger.info('Room is full, starting matching', { roomId: room.roomId });
      room.state = 'matching';
      RoomService.assignTeamsRandomly(room);

      this._broadcastToRoom(room.roomId, {
        type: 'matchingComplete',
        payload: room.toJSON(),
      });

      Logger.info('Matching complete, waiting for startGame', { roomId: room.roomId });
    }
  }

  _handleCreateRoom(ws, payload) {
    const playerId = `p_${Math.floor(Math.random() * 10000)}`;
    ws.playerId = playerId;

    const maxPlayers = Number(payload?.maxPlayers) || CONSTANTS.MAX_PLAYERS_PER_ROOM; // 修正: 定数使用
    const room = RoomService.createPrivateRoom(
      playerId,
      payload?.name || 'Unknown',
      maxPlayers
    );
    ws.roomId = room.roomId;
    GameLoopService.registerRoom(room);

    const roomCode = room.roomId.substr(-6).toUpperCase();

    ws.send(JSON.stringify({
      type: 'createRoomAck',
      payload: {
        playerId,
        roomCode,
        ...room.toJSON(),
      },
    }));

    Logger.info('Private room created', { roomId: room.roomId, roomCode, creator: playerId });
  }

  _handleJoinRoom(ws, payload) {
    const playerId = `p_${Math.floor(Math.random() * 10000)}`;
    ws.playerId = playerId;

    try {
      const room = RoomService.joinPrivateRoom(
        payload?.roomId,
        playerId,
        payload?.name || 'Unknown'
      );
      ws.roomId = room.roomId;
      GameLoopService.registerRoom(room);

      ws.send(JSON.stringify({
        type: 'joinRoomAck',
        payload: {
          playerId,
          ...room.toJSON(),
        },
      }));

      this._broadcastToRoom(room.roomId, {
        type: 'playerJoined',
        payload: room.toJSON(),
      });

      Logger.info('Player joined private room', { playerId, roomId: room.roomId });

      if (room.isFull()) {
        Logger.info('Private room is full, starting matching', { roomId: room.roomId });
        room.state = 'matching';
        RoomService.assignTeamsRandomly(room);

        this._broadcastToRoom(room.roomId, {
          type: 'matchingComplete',
          payload: room.toJSON(),
        });
      }
    } catch (error) {
      Logger.error('Failed to join private room', { error: error.message });
      ws.send(JSON.stringify({
        type: 'joinRoomError',
        payload: { error: error.message },
      }));
      ws.playerId = null;
    }
  }

  async _handleUpdate(ws, payload) {
    if (!ws.playerId || !ws.roomId) return;
    const room = RoomService.getRoomById(ws.roomId);
    if (!room) return;
    const player = room.players[ws.playerId];
    if (!player) return;

    // 追加: 簡易レート制限（例: 40ms）
    const now = Date.now();
    const last = this._lastUpdateAt.get(ws) || 0;
    if (now - last < 40) return;
    this._lastUpdateAt.set(ws, now);

    // 型/範囲ガード
    const x = Number.isFinite(payload.x) ? payload.x : player.x;
    const z = Number.isFinite(payload.z) ? payload.z : player.z;
    const state = typeof payload.state === 'string' ? payload.state : player.state;

    player.update({ x, z, state });

    try {
      const { getRedisService } = require('../services/RedisService');
      const redisService = await getRedisService();
      await redisService.setPlayerPosition(ws.playerId, player.x, player.z, player.direction, player.state, ws.roomId); // roomId追加
    } catch (error) {
      Logger.warn('Redis setPlayerPosition failed', { error: error.message });
    }

    eventEmitter.emit(EVENTS.PLAYER_UPDATED, { room, playerId: ws.playerId, playerState: player.toJSON() });
  }

  _handleAction(ws, payload) {
    if (!ws.playerId || !ws.roomId) return;

    const room = RoomService.getRoomById(ws.roomId);
    if (!room) return;

    const action = String(payload?.action || '');
    // 修正: direction を数値化・正規化
    let direction = Number(payload?.direction);
    if (!Number.isFinite(direction)) direction = 0;
    direction = ((direction + 180) % 360) - 180;

    switch (action) {
      case 'kick':
        ActionService.handleKick(room, ws.playerId, direction);
        break;
      case 'tackle':
        ActionService.handleTackle(room, ws.playerId);
        break;
      case 'pass':
        ActionService.handlePass(room, ws.playerId, direction);
        break;
      default:
        Logger.warn('Unknown action', { action });
    }
  }

  async _handleControl(ws, payload) {
    if (!ws.playerId || !ws.roomId) return;

    const room = RoomService.getRoomById(ws.roomId);
    if (!room) return;

    const { command } = payload;

    Logger.info('Control command received', { command, roomId: ws.roomId });

    switch (command) {
      case 'startGame': {
        if (room.state !== 'matching') {
          Logger.warn('Room not in matching state', { state: room.state, roomId: ws.roomId });
          return;
        }

        room.state = 'playing';
        room.resetPositions();

        // 先に配信
        this._broadcastToRoom(room.roomId, {
          type: 'gameStart',
          payload: room.toJSON(),
        });

        // Redisは非同期にルーム単位でクリア
        (async () => {
          try {
            const { getRedisService } = require('../services/RedisService');
            const redisService = await getRedisService();
            await redisService.clearRoom?.(room.roomId);
          } catch (error) {
            Logger.warn('Redis clearRoom failed (ignored)', { error: error.message, roomId: room.roomId });
          }
        })();

        Logger.info('Game started', { roomId: room.roomId });
        break;
      }

      case 'endGame': {
        if (room.state !== 'playing') {
          Logger.warn('Game is not playing', { state: room.state });
          return;
        }

        try {
          room.state = 'finished';
          const result = await MatchRepository.save({
            score: room.score,
            players: room.players,
          });

          this._broadcastToRoom(room.roomId, {
            type: 'gameEnd',
            payload: {
              ...room.toJSON(),
              matchId: result.matchId,
              winner: result.winnerTeam,
            },
          });

          // Redisは非同期にルーム単位でクリア
          (async () => {
            try {
              const { getRedisService } = require('../services/RedisService');
              const redisService = await getRedisService();
              await redisService.clearRoom?.(room.roomId);
            } catch (error) {
              Logger.warn('Redis clearRoom failed (ignored)', { error: error.message, roomId: room.roomId });
            }
          })();

          GameLoopService.unregisterRoom(ws.roomId);
          Logger.info('Game ended and saved', { roomId: room.roomId, matchId: result.matchId });
        } catch (error) {
          Logger.error('Failed to end game', { error: error.message });
          this._broadcastToRoom(room.roomId, {
            type: 'error',
            payload: { message: 'Failed to save match result' },
          });
        }
        break;
      }

      case 'restart': {
        room.timeLeft = CONSTANTS.GAME_DURATION; // 定数利用
        room.score = { alpha: 0, bravo: 0 };
        room.resetPositions();
        room.state = 'playing';

        this._broadcastToRoom(room.roomId, {
          type: 'gameRestart',
          payload: room.toJSON(),
        });

        // Redisは非同期にルーム単位でクリア
        (async () => {
          try {
            const { getRedisService } = require('../services/RedisService');
            const redisService = await getRedisService();
            await redisService.clearRoom?.(room.roomId);
          } catch (error) {
            Logger.warn('Redis clearRoom failed (ignored)', { error: error.message, roomId: room.roomId });
          }
        })();

        Logger.info('Game restarted', { roomId: room.roomId });
        break;
      }

      default:
        Logger.warn('Unknown control command', { command });
    }
  }

  async _handleLeave(ws) {
    if (!ws.playerId) return;

    RoomService.removePlayer(ws.playerId);

    try {
      const { getRedisService } = require('../services/RedisService');
      const redisService = await getRedisService();
      await redisService.deletePlayerPosition(ws.playerId, ws.roomId); // roomId追加
    } catch (error) {
      Logger.warn('Redis deletePlayerPosition failed', { error: error.message });
    }

    Logger.info('Player left', { playerId: ws.playerId });

    ws.playerId = null;
    ws.roomId = null;
  }

  async _handleClose(ws) {
    if (ws.playerId) {
      await this._handleLeave(ws);
    }
  }

  _broadcastToRoom(roomId, message) {
    const messageStr = JSON.stringify(message);

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
        client.send(messageStr);
      }
    });
  }

  _setupEventListeners() {
    // ゲームティック
    eventEmitter.on(EVENTS.GAME_TICKED, ({ roomId, roomState }) => {
      this._broadcastToRoom(roomId, {
        type: 'tick',
        payload: roomState,
      });
    });

    // プレイヤー参加
    eventEmitter.on(EVENTS.PLAYER_JOINED, ({ room }) => {
      this._broadcastToRoom(room.roomId, {
        type: 'playerJoined',
        payload: room.toJSON(),
      });
    });

    // ゴール
    eventEmitter.on(EVENTS.GOAL_SCORED, ({ room, team }) => {
      this._broadcastToRoom(room.roomId, {
        type: 'goalScored',
        payload: {
          team,
          score: room.score,
          roomState: room.toJSON(),
        },
      });
    });

    // ボールキック
    eventEmitter.on(EVENTS.BALL_KICKED, ({ room, playerId, direction }) => {
      this._broadcastToRoom(room.roomId, {
        type: 'ballKicked',
        payload: {
          playerId,
          direction,
          ballPos: { x: room.ball.x, z: room.ball.z },
        },
      });
    });

    Logger.info('WebSocket event listeners setup complete');
  }
}

module.exports = WebSocketManager;