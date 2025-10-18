// Redis連携用サービス
// 実装予定：複数サーバーインスタンス間でプレイヤーの位置情報を同期

// Redis: redis クライアントの初期化

module.exports = {
  // Redis: プレイヤーの位置情報を保存
  // キー: `player:${playerId}`
  // 値: { x, z, direction, state } をJSON文字列で保存
  setPlayerPosition: (playerId, x, z, direction, state) => {
    
    console.log(`Redis: ${playerId} -> x:${x}, z:${z}, direction:${direction}, state:${state}`);
  },

  // Redis: 全プレイヤーの位置情報を取得
  // キー: `player:*` にマッチするキーをすべて取得
  // 戻り値: { "p_1234": { x, z, direction, state }, ... }
  getAllPositions: async () => {
    
    return {};
  },

  // Redis: 特定プレイヤーの位置情報を削除
  // キー: `player:${playerId}` を削除
  deletePlayerPosition: (playerId) => {
    
    console.log(`Redis: Deleted ${playerId}`);
  },

  // Redis: ゲーム開始時に全プレイヤーの位置情報をクリア
  // キー: `player:*` にマッチするキーをすべて削除
  clearAllPositions: async () => {
    
    console.log("Redis: Cleared all player positions");
  }
};