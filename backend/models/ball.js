class Ball {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.ownerId = null;
    this.vx = 0; // 速度X
    this.vz = 0; // 速度Z
    this.DAMPING = 0.98; // 減衰率 (摩擦)
  }

  setOwner(playerId) {
    this.ownerId = playerId;
    this.vx = 0;
    this.vz = 0;
  }

  kick(direction) {
    this.ownerId = null;
    const KICK_POWER = 50; // 蹴る力
    const rad = direction * Math.PI / 180;
    this.vx = KICK_POWER * Math.cos(rad);
    this.vz = KICK_POWER * Math.sin(rad);
  }
  
  // tickで速度を更新するメソッドを追加
  updatePosition() {
    this.x += this.vx;
    this.z += this.vz;
    
    // 減衰
    this.vx *= this.DAMPING;
    this.vz *= this.DAMPING;
    
    // 速度が非常に小さくなったら停止
    if (Math.hypot(this.vx, this.vz) < 0.5) {
        this.vx = 0;
        this.vz = 0;
    }
  }

  toJSON() {
    // 速度情報はクライアントに送る必要がないため、x, z, ownerIdのみ
    return { x: this.x, z: this.z, ownerId: this.ownerId };
  }
}

module.exports = Ball;
