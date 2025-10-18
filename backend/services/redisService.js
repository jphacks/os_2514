const redis = require('redis');

// Redisクライアント初期化
const client = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  // パスワードが必要な場合
  // password: process.env.REDIS_PASSWORD
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.on('connect', () => {
  console.log('✅ Redis connected');
});

// 接続開始（非同期）
(async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
})();

const PLAYER_KEY_PREFIX = 'player:';
const PLAYER_TTL = 600; // 10分（試合が長引いても大丈夫なように）

module.exports = {
  /**
   * プレイヤーの位置情報を保存
   * キー: `player:${playerId}`
   * 値: { x, z, direction, state } をJSON文字列で保存
   */
  setPlayerPosition: async (playerId, x, z, direction, state) => {
    try {
      const key = `${PLAYER_KEY_PREFIX}${playerId}`;
      const data = JSON.stringify({ x, z, direction, state, timestamp: Date.now() });
      
      await client.setEx(key, PLAYER_TTL, data);
      
      console.log(`Redis: ${playerId} -> x:${x}, z:${z}, direction:${direction}, state:${state}`);
    } catch (error) {
      console.error('Redis setPlayerPosition error:', error);
    }
  },

  /**
   * 全プレイヤーの位置情報を取得
   * キー: `player:*` にマッチするキーをすべて取得
   * 戻り値: { "p_1234": { x, z, direction, state }, ... }
   */
  getAllPositions: async () => {
    try {
      const keys = await client.keys(`${PLAYER_KEY_PREFIX}*`);
      
      if (keys.length === 0) {
        return {};
      }
      
      const values = await client.mGet(keys);
      
      const result = {};
      keys.forEach((key, index) => {
        const playerId = key.replace(PLAYER_KEY_PREFIX, '');
        try {
          result[playerId] = JSON.parse(values[index]);
        } catch (e) {
          console.error(`Failed to parse data for ${playerId}:`, e);
        }
      });
      
      return result;
    } catch (error) {
      console.error('Redis getAllPositions error:', error);
      return {};
    }
  },

  /**
   * 特定プレイヤーの位置情報を取得
   */
  getPlayerPosition: async (playerId) => {
    try {
      const key = `${PLAYER_KEY_PREFIX}${playerId}`;
      const data = await client.get(key);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Redis getPlayerPosition error:', error);
      return null;
    }
  },

  /**
   * 特定プレイヤーの位置情報を削除
   * キー: `player:${playerId}` を削除
   */
  deletePlayerPosition: async (playerId) => {
    try {
      const key = `${PLAYER_KEY_PREFIX}${playerId}`;
      await client.del(key);
      
      console.log(`Redis: Deleted ${playerId}`);
    } catch (error) {
      console.error('Redis deletePlayerPosition error:', error);
    }
  },

  /**
   * ゲーム開始時に全プレイヤーの位置情報をクリア
   * キー: `player:*` にマッチするキーをすべて削除
   */
  clearAllPositions: async () => {
    try {
      const keys = await client.keys(`${PLAYER_KEY_PREFIX}*`);
      
      if (keys.length > 0) {
        await client.del(keys);
      }
      
      console.log(`Redis: Cleared ${keys.length} player positions`);
    } catch (error) {
      console.error('Redis clearAllPositions error:', error);
    }
  },

  /**
   * Redis接続を閉じる（アプリケーション終了時）
   */
  disconnect: async () => {
    await client.quit();
    console.log('Redis disconnected');
  }
};