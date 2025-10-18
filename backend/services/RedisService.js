const redis = require('redis');
const ENV = require('../config/environment');
const Logger = require('../utils/Logger');

class RedisService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.prefix = 'player:'; // キー: player:{roomId}:{playerId}
    this.ttlSeconds = 600;
  }

  async connect() {
    if (this.connected && this.client) return;

    const hasUrl = !!ENV.REDIS_URL;
    const host = ENV.REDIS_HOST || '127.0.0.1';
    const port = Number(ENV.REDIS_PORT || 6379);
    const useTls = String(ENV.REDIS_TLS || '').toLowerCase() === 'true';
    const scheme = useTls ? 'rediss' : 'redis';
    const url = hasUrl ? ENV.REDIS_URL : `${scheme}://${host}:${port}`;

    // v4: url か socket.host/socket.port のどちらかを使用
    const base = hasUrl
      ? { url }
      : {
          socket: {
            host,
            port,
            reconnectStrategy: (retries) => Math.min(100 + retries * 50, 1000),
          },
        };

    this.client = require('redis').createClient({
      ...base,
      password: ENV.REDIS_PASSWORD || undefined,
      // url 指定の場合も socket オプションは使えるので再接続戦略は付けておく
      socket: {
        ...(base.socket || {}),
        reconnectStrategy: (retries) => Math.min(100 + retries * 50, 1000),
      },
    });

    this.client.on('error', (err) => {
      this.connected = false;
      Logger.error('Redis error', { message: err.message });
    });
    this.client.on('ready', () => {
      this.connected = true;
      Logger.info('Redis ready');
    });

    await this.client.connect();
    this.connected = true;
  }

  isAvailable() {
    return this.connected && !!this.client;
  }

  // ルームスコープキー
  _key(roomId, playerId) {
    const r = roomId || 'global';
    return `${this.prefix}${r}:${playerId}`;
  }

  async setPlayerPosition(playerId, x, z, direction, state, roomId) {
    if (!this.isAvailable()) return;
    try {
      const key = this._key(roomId, playerId);
      const data = JSON.stringify({ x, z, direction, state });
      await this.client.setEx(key, this.ttlSeconds, data);
    } catch (err) {
      Logger.error('Redis setPlayerPosition error', {
        playerId,
        roomId,
        message: err.message,
      });
    }
  }

  async getPlayerPosition(playerId, roomId) {
    if (!this.isAvailable()) return null;
    try {
      const key = this._key(roomId, playerId);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      Logger.error('Redis getPlayerPosition error', {
        playerId,
        roomId,
        message: err.message,
      });
      return null;
    }
  }

  async deletePlayerPosition(playerId, roomId) {
    if (!this.isAvailable()) return;
    try {
      const key = this._key(roomId, playerId);
      await this.client.del(key);
    } catch (err) {
      Logger.error('Redis deletePlayerPosition error', {
        playerId,
        roomId,
        message: err.message,
      });
    }
  }

  // ルーム単位クリア（SCAN + バッチDEL）
  async clearRoom(roomId) {
    if (!this.isAvailable()) return;
    const pattern = `${this.prefix}${roomId || 'global'}:*`;
    let batch = [];
    let total = 0;
    try {
      for await (const key of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 200,
      })) {
        batch.push(key);
        if (batch.length >= 500) {
          await this.client.del(batch);
          total += batch.length;
          batch = [];
        }
      }
      if (batch.length) {
        await this.client.del(batch);
        total += batch.length;
      }
      if (total) {
        Logger.info('Redis room cleared', { roomId, keysCleared: total });
      }
    } catch (err) {
      Logger.error('Redis clearRoom error', { roomId, message: err.message });
    }
  }

  // 全体クリア（本番では原則非推奨）
  async clearAll() {
    if (!this.isAvailable()) return;
    let batch = [];
    let total = 0;
    try {
      for await (const key of this.client.scanIterator({
        MATCH: `${this.prefix}*`,
        COUNT: 500,
      })) {
        batch.push(key);
        if (batch.length >= 500) {
          await this.client.del(batch);
          total += batch.length;
          batch = [];
        }
      }
      if (batch.length) {
        await this.client.del(batch);
        total += batch.length;
      }
      Logger.info('Redis cleared', { keysCleared: total });
    } catch (err) {
      Logger.error('Redis clearAll error', { message: err.message });
    }
  }

  async disconnect() {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch (err) {
      Logger.error('Redis disconnect error', { message: err.message });
    } finally {
      this.connected = false;
      this.client = null;
    }
  }
}

let instance = null;
async function getRedisService() {
  if (!instance) {
    instance = new RedisService();
    try {
      await instance.connect();
    } catch (err) {
      Logger.error('Redis connection failed', { message: err.message });
    }
  }
  return instance;
}

module.exports = { getRedisService, RedisService };