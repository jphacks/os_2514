const CONSTANTS = require('../config/constants');

class Ball {
  constructor(x = 300, z = 200) {
    this.x = x;
    this.z = z;
    this.ownerId = null;
    this.vx = 0;
    this.vz = 0;
  }

  /**
   * ボール所有者を設定
   */
  setOwner(playerId) {
    this.ownerId = playerId;
    this.vx = 0;
    this.vz = 0;
  }

  /**
   * ボールを蹴る
   */
  kick(direction, power = CONSTANTS.KICK_POWER) {
    this.ownerId = null;
    const rad = (direction * Math.PI) / 180;
    this.vx = power * Math.cos(rad);
    this.vz = power * Math.sin(rad);
  }

  /**
   * ボール位置を更新（物理演算）
   */
  updatePosition() {
    this.x += this.vx;
    this.z += this.vz;

    // 壁反射
    if (this.x < 0 || this.x > CONSTANTS.CANVAS_WIDTH) {
      this.vx *= -0.8;
      this.x = Math.max(0, Math.min(CONSTANTS.CANVAS_WIDTH, this.x));
    }
    if (this.z < 0 || this.z > CONSTANTS.CANVAS_HEIGHT) {
      this.vz *= -0.8;
      this.z = Math.max(0, Math.min(CONSTANTS.CANVAS_HEIGHT, this.z));
    }

    // 減衰
    this.vx *= CONSTANTS.BALL_DAMPING;
    this.vz *= CONSTANTS.BALL_DAMPING;

    // 速度が小さすぎたら停止
    if (Math.hypot(this.vx, this.vz) < 0.5) {
      this.vx = 0;
      this.vz = 0;
    }
  }

  /**
   * ボールが動いているか判定
   */
  isMoving() {
    return Math.hypot(this.vx, this.vz) >= 0.5;
  }

  /**
   * ボール情報をJSON形式で返す
   */
  toJSON() {
    return {
      x: this.x,
      z: this.z,
      ownerId: this.ownerId,
    };
  }
}

module.exports = Ball;