const redis = require('redis');
const ENV = require('../config/environment');
const Logger = require('../utils/Logger');

class RedisService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.prefix = 'player:';
    this.ttl = 600; // 10分
  }

  /**
   * Redis接続
   */
  async connect() {
    try {
      Logger.info('Connecting to Redis...');

      this.client = redis.createClient({
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT,
        password: ENV.REDIS_PASSWORD || undefined,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              Logger.error('Redis: max reconnection retries exceeded');
              return new Error('Max retries exceeded');
            }
            return Math.min(retries * 50, 500);
          },
        },
      });

      // エラーハンドリング
      this.client.on('error', (err) => {
        Logger.error('Redis error', { message: err.message });
        this.connected = false;
      });

      this.client.on('connect', () => {
        Logger.info('Redis: socket connected');
        this.connected = true;
      });

      this.client.on('ready', () => {
        Logger.info('Redis: ready');
      });

      this.client.on('reconnecting', () => {
        Logger.warn('Redis: reconnecting...');
      });

      // 接続実行
      await this.client.connect();
      this.connected = true;
      Logger.info('Redis connected successfully');

      return true;
    } catch (error) {
      Logger.error('Redis connection failed', { message: error.message });
      this.connected = false;
      return false;
    }
  }

  /**
   * プレイヤー位置を保存
   */
  async setPlayerPosition(playerId, x, z, direction, state) {
    if (!this.connected || !this.client) {
      Logger.warn('Redis: not connected, skipping setPlayerPosition');
      return;
    }

    try {
      const key = `${this.prefix}${playerId}`;
      const data = JSON.stringify({ x, z, direction, state });
      await this.client.setEx(key, this.ttl, data);
    } catch (error) {
      Logger.error('Redis setPlayerPosition error', { playerId, message: error.message });
    }
  }

  /**
   * 全プレイヤーの位置を取得
   */
  async getAllPositions() {
    if (!this.connected || !this.client) {
      Logger.warn('Redis: not connected, returning empty positions');
      return {};
    }

    try {
      const keys = await this.client.keys(`${this.prefix}*`);

      if (!keys || keys.length === 0) {
        return {};
      }

      const result = {};

      for (const key of keys) {
        const playerId = key.replace(this.prefix, '');
        const data = await this.client.get(key);

        if (data) {
          try {
            result[playerId] = JSON.parse(data);
          } catch (parseError) {
            Logger.error('Redis: failed to parse data', {
              playerId,
              message: parseError.message,
            });
          }
        }
      }

      return result;
    } catch (error) {
      Logger.error('Redis getAllPositions error', { message: error.message });
      return {};
    }
  }

  /**
   * 特定プレイヤーの位置を取得
   */
  async getPlayerPosition(playerId) {
    if (!this.connected || !this.client) {
      return null;
    }

    try {
      const key = `${this.prefix}${playerId}`;
      const data = await this.client.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      Logger.error('Redis getPlayerPosition error', { playerId, message: error.message });
      return null;
    }
  }

  /**
   * プレイヤー位置を削除
   */
  async deletePlayerPosition(playerId) {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      const key = `${this.prefix}${playerId}`;
      await this.client.del(key);
    } catch (error) {
      Logger.error('Redis deletePlayerPosition error', { playerId, message: error.message });
    }
  }

  /**
   * 全プレイヤー位置をクリア
   */
  async clearAll() {
    if (!this.connected || !this.client) {
      Logger.warn('Redis: not connected, skipping clearAll');
      return;
    }

    try {
      const keys = await this.client.keys(`${this.prefix}*`);

      if (!keys || keys.length === 0) {
        Logger.debug('Redis: no keys to clear');
        return;
      }

      await this.client.del(keys);
      Logger.info('Redis cleared', { keysCleared: keys.length });
    } catch (error) {
      Logger.error('Redis clearAll error', { message: error.message });
    }
  }

  /**
   * Redis切断
   */
  async disconnect() {
    if (this.client && this.connected) {
      try {
        await this.client.quit();
        this.connected = false;
        Logger.info('Redis disconnected');
      } catch (error) {
        Logger.error('Redis disconnect error', { message: error.message });
      }
    }
  }

  /**
   * 接続状態を取得
   */
  isConnected() {
    return this.connected;
  }
}

// シングルトン
let instance = null;

/**
 * RedisService インスタンスを取得
 */
async function getRedisService() {
  if (!instance) {
    instance = new RedisService();
    try {
      await instance.connect();
    } catch (error) {
      Logger.error('Redis service initialization failed', { message: error.message });
    }
  }
  return instance;
}

module.exports = {
  getRedisService,
  RedisService,
};