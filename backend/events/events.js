const EVENTS = {
  // プレイヤー
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_UPDATED: 'player:updated',
  PLAYER_STUNNED: 'player:stunned',
  
  // ボール
  BALL_KICKED: 'ball:kicked',
  BALL_OWNED: 'ball:owned',
  GOAL_SCORED: 'goal:scored',
  
  // ゲーム
  GAME_STARTED: 'game:started',
  GAME_TICKED: 'game:ticked',
  GAME_ENDED: 'game:ended',
  
  // アクション
  ACTION_TACKLE: 'action:tackle',
  ACTION_PASS: 'action:pass',
};

module.exports = EVENTS;