const Player = require('./Player');
const Ball = require('./Ball');
const CONSTANTS = require('../config/constants');
const eventEmitter = require('../events/EventEmitter');
const EVENTS = require('../events/events');

class Room {
  constructor(roomId, maxPlayers = CONSTANTS.MAX_PLAYERS_PER_ROOM, isPrivate = false) {
    this.roomId = roomId;
    this.maxPlayers = maxPlayers;
    this.isPrivate = isPrivate;
    this.players = {}; // playerId -> Player
    this.ball = new Ball();
    this.state = 'waiting'; // 'waiting' | 'matching' | 'playing' | 'finished'
    this.score = { alpha: 0, bravo: 0 };
    this.timeLeft = CONSTANTS.GAME_DURATION;
    this._lastTickAt = null;
    this.createdAt = Date.now();
  }

  /**
   * プレイヤーを追加
   */
  addPlayer(player) {
    if (this.players[player.id]) {
      throw new Error(`Player ${player.id} already in room`);
    }
    if (this.getPlayerCount() >= this.maxPlayers) {
      throw new Error('Room is full');
    }
    this.players[player.id] = player;
  }

  /**
   * プレイヤーを削除
   */
  removePlayer(playerId) {
    delete this.players[playerId];
    if (this.ball.ownerId === playerId) {
      this.ball.ownerId = null;
    }
  }

  /**
   * プレイヤー数を取得
   */
  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  /**
   * ルームが満員かどうか
   */
  isFull() {
    return this.getPlayerCount() >= this.maxPlayers;
  }

  /**
   * チーム別プレイヤーを取得
   */
  getPlayersByTeam(team) {
    return Object.values(this.players).filter(p => p.team === team);
  }

  /**
   * ゲーム開始時のポジション初期化
   */
  resetPositions() {
    const centerX = CONSTANTS.CANVAS_WIDTH / 2;
    const centerZ = CONSTANTS.CANVAS_HEIGHT / 2;

    // ボール初期化
    this.ball.x = centerX;
    this.ball.z = centerZ;
    this.ball.ownerId = null;
    this.ball.vx = 0;
    this.ball.vz = 0;

    // プレイヤー初期化
    Object.values(this.players).forEach(p => {
      p.x = centerX - 50 + Math.random() * 100;
      p.z = centerZ - 50 + Math.random() * 100;
      p.state = 'idle';
      p.stunEndTime = 0;
    });
  }

  /**
   * ゲームの1フレーム処理
   */
  tick(now) {
    if (this.state !== 'playing') return;

    // スタン状態の更新／アクション解除
    Object.values(this.players).forEach(p => {
      if (p.state === 'stun' && now >= p.stunEndTime) p.removeStun();
      if ((p.state === 'kick' || p.state === 'tackle') && now > p.lastActionTime + 100) p.state = 'idle';
    });

    // ボール自動拾い
    if (!this.ball.ownerId && !this.ball.isMoving()) {
      Object.values(this.players).forEach(p => {
        if (p.state !== 'stun' && !this.ball.ownerId) {
          const dist = Math.hypot(p.x - this.ball.x, p.z - this.ball.z);
          if (dist < CONSTANTS.BALL_PICKUP_RANGE) {
            this.ball.setOwner(p.id);
          }
        }
      });
    }

    // ボール所有者と一緒に動く
    if (this.ball.ownerId && this.players[this.ball.ownerId]) {
      const owner = this.players[this.ball.ownerId];
      this.ball.x = owner.x;
      this.ball.z = owner.z;
    }

    // ボール：所有者に追従 or 物理更新 → 接触で即取得
    const owner = this.ball.ownerId ? this.players[this.ball.ownerId] : null;
    if (owner) {
      this.ball.x = owner.x;
      this.ball.z = owner.z;
    } else {
      this.ball.updatePosition();

      // 動いていても近距離なら取得
      for (const p of Object.values(this.players)) {
        if (p.state === 'stun') continue;
        const dx = p.x - this.ball.x;
        const dz = p.z - this.ball.z;
        if (dx*dx + dz*dz <= (CONSTANTS.BALL_PICKUP_RANGE ** 2)) {
          this.ball.setOwner(p.id);
          break;
        }
      }
    }

    

    // ゴール判定
    const inGoalZone = this.ball.z > CONSTANTS.GOAL_Y1 && this.ball.z < CONSTANTS.GOAL_Y2;

    if (this.ball.x < CONSTANTS.GOAL_X_BOUNDARY && inGoalZone) {
      this.score.bravo++;
      eventEmitter.emit(EVENTS.GOAL_SCORED, { room: this, team: 'bravo' });
      this.resetPositions();
    } else if (
      this.ball.x > CONSTANTS.CANVAS_WIDTH - CONSTANTS.GOAL_X_BOUNDARY &&
      inGoalZone
    ) {
      this.score.alpha++;
      eventEmitter.emit(EVENTS.GOAL_SCORED, { room: this, team: 'alpha' });
      this.resetPositions();
    }

    const nowMs = Number.isFinite(now) ? now : Date.now();
    const dt = this._lastTickAt ? (nowMs - this._lastTickAt) / 1000 : 0;
    this._lastTickAt = nowMs;

    if (this.state === 'playing' && dt > 0) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft === 0) {
        this.state = 'finished';
      }
    }
  }

  /**
   * ルーム情報をJSON形式で返す
   */
  toJSON() {
    return {
      roomId: this.roomId,
      state: this.state,
      players: Object.values(this.players).map(p => p.toJSON()),
      ball: this.ball.toJSON(),
      score: this.score,
      timeLeft: this.timeLeft,
      playerCount: this.getPlayerCount(),
      maxPlayers: this.maxPlayers,
    };
  }
}

module.exports = Room;