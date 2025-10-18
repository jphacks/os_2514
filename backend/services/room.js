const Player = require("../models/player");
const Ball = require("../models/ball");

const STUN_DURATION = 1000;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const BALL_PICKUP_RANGE = 20;
const TACKLE_RANGE = 30; // タックル判定距離
const PASS_RANGE = 100;  // パス受け取り判定距離

class Room {
  constructor() {
    this.players = {};
    this.ball = new Ball();
    this.state = "waiting";
    this.timeLeft = 300;
    this.score = { alpha: 0, bravo: 0 };
    this.initPositions();
  }

  static getInstance() {
    if (!Room.instance) Room.instance = new Room();
    return Room.instance;
  }
  
  initPositions() {
    this.ball.x = 300;
    this.ball.z = 200;
    this.ball.ownerId = null;
    this.ball.vx = 0;
    this.ball.vz = 0;
    
    Object.values(this.players).forEach(p => { 
      p.x = 250 + Math.random() * 100;
      p.z = 150 + Math.random() * 100;
      p.state = "idle"; 
      p.stunEndTime = 0;
    });
  }

  addPlayer(id, name, team) {
    this.players[id] = new Player(id, name, team);
    
    this.players[id].x = 250 + Math.random() * 100;
    this.players[id].z = 150 + Math.random() * 100;
    
    return this.players[id];
  }

  removePlayer(id) {
    delete this.players[id];
    if (this.ball.ownerId === id) this.ball.ownerId = null;
  }

  updatePlayer(playerId, data) {
    const player = this.players[playerId];
    if (!player) return;
    
    if (player.state === "stun") return;
    
    if (data.x !== undefined) {
      player.x = Math.max(0, Math.min(CANVAS_WIDTH, data.x));
    }
    if (data.z !== undefined) {
      player.z = Math.max(0, Math.min(CANVAS_HEIGHT, data.z));
    }
    
    if (data.direction !== undefined) {
      player.direction = (data.direction % 360 + 360) % 360;
    }
    
    if (data.state !== undefined && data.state !== "stun") {
      player.state = data.state;
    }
    
    if (data.state === "run" && this.ball.ownerId === playerId) {
      const dx = player.x - (data.x || player.x);
      const dz = player.z - (data.z || player.z);
      player.x -= dx * 0.2;
      player.z -= dz * 0.2;
    }
  }

  updateFromRedis(redisPositions) {
    // Redis実装時に使用
  }

  handleAction(playerId, actionData) {
    const player = this.players[playerId];
    if (!player || this.state !== "playing") return;
    
    if (player.state === "stun") return;

    switch(actionData.action) {
      case "kick":
        if (this.ball.ownerId !== playerId) return;
        
        this.ball.kick(actionData.direction || player.direction);
        this.ball.ownerId = null;
        player.state = "kick";
        player.lastActionTime = Date.now();
        break;

      case "tackle":
        // 修正: ボール所有者の有無を問わず、近くのプレイヤーに tackle
        let tackleTarget = null;
        let minDist = 9999;
        
        Object.values(this.players).forEach(p => {
          // 敵チームのプレイヤーを対象
          if (p.team !== player.team && p.state !== "stun") {
            const dist = Math.hypot(p.x - player.x, p.z - player.z);
            if (dist < minDist) {
              minDist = dist;
              tackleTarget = p;
            }
          }
        });
        
        // 近い敵がいたら tackle 実行
        if (tackleTarget && minDist < TACKLE_RANGE) {
          // ターゲットがボール所有者なら奪取
          if (this.ball.ownerId === tackleTarget.id) {
            this.ball.setOwner(player.id);
          }
          // ターゲットをスタン状態に
          tackleTarget.state = "stun";
          tackleTarget.stunEndTime = Date.now() + STUN_DURATION;
        }
        
        player.state = "tackle";
        player.lastActionTime = Date.now();
        break;
      
      case "pass":
        if (this.ball.ownerId !== playerId) return;
        
        // 修正: パス受け取り判定ロジック
        let passTarget = null;
        let minPassDist = 9999;
        
        // 蹴ったボールの方向に近い味方プレイヤーを探す
        const kickDirection = actionData.direction || player.direction;
        const rad = kickDirection * Math.PI / 180;
        
        Object.values(this.players).forEach(p => {
          // 同じチームのプレイヤーのみ対象
          if (p.team === player.team && p.id !== playerId) {
            const dist = Math.hypot(p.x - player.x, p.z - player.z);
            
            // パス範囲内に味方がいるか確認
            if (dist < PASS_RANGE) {
              // ボールの移動方向に近い味方を優先
              const targetDirection = Math.atan2(
                p.z - player.z,
                p.x - player.x
              ) * 180 / Math.PI;
              const angleDiff = Math.abs(
                ((targetDirection - kickDirection + 180) % 360) - 180
              );
              
              // 角度の差と距離を組み合わせてスコア算出
              const passScore = dist + angleDiff * 2;
              
              if (passScore < minPassDist) {
                minPassDist = passScore;
                passTarget = p;
              }
            }
          }
        });
        
        // パスターゲットが見つかった場合、ボールを渡す
        if (passTarget && minPassDist < PASS_RANGE + 50) {
          this.ball.setOwner(passTarget.id);
          console.log(`Pass: ${player.name} -> ${passTarget.name}`);
        } else {
          // ターゲットなしの場合は普通にキック
          this.ball.kick(kickDirection);
          this.ball.ownerId = null;
        }
        
        player.state = "kick";
        player.lastActionTime = Date.now();
        break;
    }
  }

  tick() {
    const now = Date.now();
    
    Object.values(this.players).forEach(p => {
      if (p.state === "stun" && now >= p.stunEndTime) {
        p.state = "idle";
        p.stunEndTime = 0;
        return;
      }
      
      if (p.state !== "stun" && (p.state === "kick" || p.state === "tackle")) {
        if (now > (p.lastActionTime || 0) + 100) {
          p.state = "idle";
        }
      }
    });

    if (this.state === "playing") {
      
      if (!this.ball.ownerId) {
        this.ball.updatePosition();
        
        if (this.ball.x < 0 || this.ball.x > CANVAS_WIDTH) {
          this.ball.vx *= -0.8;
          this.ball.x = Math.max(0, Math.min(CANVAS_WIDTH, this.ball.x));
        }
        if (this.ball.z < 0 || this.ball.z > CANVAS_HEIGHT) {
          this.ball.vz *= -0.8;
          this.ball.z = Math.max(0, Math.min(CANVAS_HEIGHT, this.ball.z));
        }
      }
      
      if (!this.ball.ownerId && Math.hypot(this.ball.vx, this.ball.vz) < 5) {
        for (const playerId in this.players) {
          const p = this.players[playerId];
          const dist = Math.hypot(p.x - this.ball.x, p.z - this.ball.z);
          
          if (dist < BALL_PICKUP_RANGE && p.state !== "stun") {
            this.ball.setOwner(p.id);
            break;
          }
        }
      }

      if (this.ball.ownerId && this.players[this.ball.ownerId]) {
        const owner = this.players[this.ball.ownerId];
        this.ball.x = owner.x;
        this.ball.z = owner.z;
      }

      const GOAL_Y1 = 150;
      const GOAL_Y2 = 250;

      if (this.ball.x < 10 && this.ball.z > GOAL_Y1 && this.ball.z < GOAL_Y2) {
        console.log("GOAL for Bravo!");
        this.score.bravo += 1;
        this.restart();
      } else if (this.ball.x > CANVAS_WIDTH - 10 && this.ball.z > GOAL_Y1 && this.ball.z < GOAL_Y2) {
        console.log("GOAL for Alpha!");
        this.score.alpha += 1;
        this.restart();
      }
    }
  }

  startGame() { 
    this.state = "playing"; 
  }

  endGame() { 
    this.state = "finished";
    // DB: ここでDBサービスに試合結果を保存
  }

  restart() {
    this.initPositions();
    this.state = "playing";
  }

  toJSON() {
    return {
      state: this.state,
      score: this.score,
      ball: this.ball.toJSON(),
      players: Object.values(this.players).map(p => p.toJSON())
    };
  }
}

module.exports = Room;