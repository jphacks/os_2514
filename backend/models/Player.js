const CONSTANTS = require('../config/constants');

class Player {
  constructor(id, name, team = null) {
    this.id = id;
    this.name = name;
    this.team = team; // 'alpha' | 'bravo' | null
    this.x = 0;
    this.z = 0;
    this.direction = 0;
    this.state = 'idle'; // 'idle' | 'run' | 'kick' | 'tackle' | 'stun'
    this.stunEndTime = 0;
    this.lastActionTime = 0;
  }

  /**
   * プレイヤー位置・状態を更新
   */
  update(data) {
    if (data.x !== undefined) {
      this.x = Math.max(0, Math.min(CONSTANTS.CANVAS_WIDTH, data.x));
    }
    if (data.z !== undefined) {
      this.z = Math.max(0, Math.min(CONSTANTS.CANVAS_HEIGHT, data.z));
    }
    if (data.direction !== undefined) {
      this.direction = (data.direction % 360 + 360) % 360;
    }
    if (data.state !== undefined && data.state !== 'stun') {
      this.state = data.state;
    }
  }

  /**
   * プレイヤーをスタン状態にする
   */
  stun(now, duration = CONSTANTS.STUN_DURATION) {
    this.state = 'stun';
    this.stunEndTime = now + duration;
  }

  /**
   * スタン状態かどうか判定
   */
  isStunned(now) {
    return this.state === 'stun' && now < this.stunEndTime;
  }

  /**
   * スタン状態を解除
   */
  removeStun() {
    if (this.state === 'stun') {
      this.state = 'idle';
      this.stunEndTime = 0;
    }
  }

  /**
   * アクション実行時刻を記録
   */
  recordAction() {
    this.lastActionTime = Date.now();
  }

  /**
   * アクションクールダイム中か判定
   */
  isInActionCooldown(now, cooldownMs = 100) {
    return now - this.lastActionTime < cooldownMs;
  }

  /**
   * プレイヤー情報をJSON形式で返す
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      team: this.team,
      x: this.x,
      z: this.z,
      direction: this.direction,
      state: this.state,
    };
  }
}

module.exports = Player;