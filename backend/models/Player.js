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

  static _normalizeDeg(deg) {
    let a = ((deg + 180) % 360 + 360) % 360 - 180;
    return a === -180 ? 180 : a;
  }

  update({ x, z, state, direction }) {
    const prevX = this.x;
    const prevZ = this.z;

    if (Number.isFinite(x)) this.x = x;
    if (Number.isFinite(z)) this.z = z;
    if (typeof state === 'string') this.state = state;

    // 進行方向から向きを決定（小さな揺れは無視）
    const dx = this.x - prevX;
    const dz = this.z - prevZ;
    const moved2 = dx * dx + dz * dz;
    const EPS2 = 1e-6;

    if (moved2 > EPS2) {
      const deg = (Math.atan2(dz, dx) * 180) / Math.PI;
      this.direction = Player._normalizeDeg(deg);
    } else if (Number.isFinite(direction)) {
      // 位置がほぼ変わらない場合のみ、明示指定があれば反映
      this.direction = Player._normalizeDeg(direction);
    }

    return this;
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