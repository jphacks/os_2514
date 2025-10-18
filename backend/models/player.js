class Player {
  constructor(id, name, team) {
    this.id = id;
    this.name = name;
    this.team = team;       // "alpha" / "bravo"
    this.x = 0;
    this.z = 0;
    this.direction = 0;     // 向き（度数）
    this.state = "idle";    // "idle" / "run" / "kick" / "tackle" / "stun"
    this.stunEndTime = 0;   // スタン解除時刻 (ミリ秒)
    this.lastActionTime = 0; // アクション状態解除用（kick/tackleの状態保持時間を管理）
  }

  move(dx, dz) {
    this.x += dx;
    this.z += dz;
    this.state = dx || dz ? "run" : "idle";
  }

  kick(ball, direction) {
    ball.kick(direction);
    this.state = "kick";
    this.lastActionTime = Date.now();
  }

  pass(targetPlayer, ball) {
    if (!this.hasBall) return;
    this.hasBall = false;
    ball.setOwner(targetPlayer.id);
    this.state = "pass";
  }

  tackle(targetPlayer) {
    this.state = "tackle";
    this.lastActionTime = Date.now();
    if (targetPlayer.hasBall) {
      targetPlayer.hasBall = false;
      this.hasBall = true;
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      team: this.team,
      x: this.x,
      z: this.z,
      direction: this.direction,
      state: this.state
    };
  }
}

module.exports = Player;