const Player = require("./player");
const Ball = require("./ball");
const dbService = require("../services/dbService");
const redisService = require("../services/redisService");

const STUN_DURATION = 1000;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const BALL_PICKUP_RANGE = 20;
const TACKLE_RANGE = 30;
const PASS_RANGE = 100;

class Room {
  constructor(roomId, maxPlayers = 6, isPrivate = false) {
    this.roomId = roomId;
    this.maxPlayers = maxPlayers;
    this.isPrivate = isPrivate; // 追加: カスタム部屋識別
    this.players = {};
    this.ball = new Ball();
    this.state = "waiting"; // waiting, matching, playing, finished
    this.timeLeft = 300;
    this.score = { alpha: 0, bravo: 0 };
    this.createdAt = Date.now();
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  isFull() {
    return this.getPlayerCount() >= this.maxPlayers;
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

  /**
   * ✅ Redisから取得した位置情報でプレイヤーを更新
   * @param {Object} redisPositions - { "p_1234": { x, z, direction, state }, ... }
   */
  updateFromRedis(redisPositions) {
    if (!redisPositions || Object.keys(redisPositions).length === 0) {
      return;
    }

    Object.keys(redisPositions).forEach(playerId => {
      const player = this.players[playerId];
      if (!player) return;

      const redisData = redisPositions[playerId];
      
      // スタン中は更新しない
      if (player.state === "stun") return;

      // Redis の位置情報で更新
      if (redisData.x !== undefined) {
        player.x = Math.max(0, Math.min(CANVAS_WIDTH, redisData.x));
      }
      if (redisData.z !== undefined) {
        player.z = Math.max(0, Math.min(CANVAS_HEIGHT, redisData.z));
      }
      if (redisData.direction !== undefined) {
        player.direction = (redisData.direction % 360 + 360) % 360;
      }
      if (redisData.state !== undefined && redisData.state !== "stun") {
        player.state = redisData.state;
      }
    });
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
        let tackleTarget = null;
        let minDist = 9999;
        
        Object.values(this.players).forEach(p => {
          if (p.team !== player.team && p.state !== "stun") {
            const dist = Math.hypot(p.x - player.x, p.z - player.z);
            if (dist < minDist) {
              minDist = dist;
              tackleTarget = p;
            }
          }
        });
        
        if (tackleTarget && minDist < TACKLE_RANGE) {
          if (this.ball.ownerId === tackleTarget.id) {
            this.ball.setOwner(player.id);
          }
          tackleTarget.state = "stun";
          tackleTarget.stunEndTime = Date.now() + STUN_DURATION;
        }
        
        player.state = "tackle";
        player.lastActionTime = Date.now();
        break;
      
      case "pass":
        if (this.ball.ownerId !== playerId) return;
        
        let passTarget = null;
        let minPassDist = 9999;
        
        const kickDirection = actionData.direction || player.direction;
        const rad = kickDirection * Math.PI / 180;
        
        Object.values(this.players).forEach(p => {
          if (p.team === player.team && p.id !== playerId) {
            const dist = Math.hypot(p.x - player.x, p.z - player.z);
            
            if (dist < PASS_RANGE) {
              const targetDirection = Math.atan2(
                p.z - player.z,
                p.x - player.x
              ) * 180 / Math.PI;
              const angleDiff = Math.abs(
                ((targetDirection - kickDirection + 180) % 360) - 180
              );
              
              const passScore = dist + angleDiff * 2;
              
              if (passScore < minPassDist) {
                minPassDist = passScore;
                passTarget = p;
              }
            }
          }
        });
        
        if (passTarget && minPassDist < PASS_RANGE + 50) {
          this.ball.setOwner(passTarget.id);
          console.log(`Pass: ${player.name} -> ${passTarget.name}`);
        } else {
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

  startMatching() {
    this.state = "matching";
    console.log(`[Room ${this.roomId}] Matching started`);
  }

  async startGame() {
    this.state = "playing";
    this.initPositions();

    try {
      const redisService = require("../services/redisService");
      await redisService.clearAllPositions();
      console.log(`[Room ${this.roomId}] Redis positions cleared for new game`);
    } catch (error) {
      console.error("❌ Failed to clear Redis positions:", error);
    }

    console.log(`[Room ${this.roomId}] Game started`);
  }

  async endGame() { 
    this.state = "finished";

    console.log(`[Room ${this.roomId}] Game ended. Saving to database...`);
    
    // DB: PostgreSQLに試合結果を保存
    try {
      const matchData = {
        score: this.score,
        players: this.players
      };
      
      const result = await dbService.saveMatchResult(matchData);
      console.log(`✅ Match result saved to database (Match ID: ${result.matchId})`);
      
      // ✅ Redis: 試合終了後にプレイヤー位置情報をクリア
      const redisService = require("../services/redisService");
      await redisService.clearAllPositions();
      console.log("✅ Redis player positions cleared");
      
      return result;
      
    } catch (error) {
      console.error("❌ Failed to save match result in room.endGame:", error);
      throw error;
    }
  }

  restart() {
    this.initPositions();
    this.state = "playing";
  }

  toJSON() {
    return {
      roomId: this.roomId,
      state: this.state,
      score: this.score,
      ball: this.ball.toJSON(),
      players: Object.values(this.players).map(p => p.toJSON()),
      playerCount: this.getPlayerCount(),
      maxPlayers: this.maxPlayers
    };
  }
}

module.exports = Room;