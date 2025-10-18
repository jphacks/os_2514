const eventEmitter = require('../events/EventEmitter');
const EVENTS = require('../events/events');
const CONSTANTS = require('../config/constants');

class ActionService {
  // 近ければボールを自動取得してからアクション可能にする
  _ensurePossessionIfClose(room, player) {
    const ball = room.ball;
    if (!ball || !player) return false;
    if (ball.ownerId === player.id) return true;

    const dx = player.x - ball.x;
    const dz = player.z - ball.z;
    if (dx*dx + dz*dz <= (CONSTANTS.BALL_PICKUP_RANGE ** 2)) {
      ball.setOwner(player.id);
      return true;
    }
    return false;
  }

  handleKick(room, playerId, direction) {
    const player = room.players[playerId];
    if (!player || room.state !== 'playing') return;
    if (!this._ensurePossessionIfClose(room, player)) return;
    room.ball.kick(direction, CONSTANTS.KICK_POWER);
    player.state = 'kick'; player.lastActionTime = Date.now();
  }

  handleTackle(room, playerId) {
    const player = room.players[playerId];
    if (!player || room.state !== 'playing') return;
    if (player.state === 'stun') return;

    let tackleTarget = null;
    let minDist = CONSTANTS.TACKLE_RANGE;

    Object.values(room.players).forEach(p => {
      if (p.team !== player.team && p.state !== 'stun') {
        const dist = Math.hypot(p.x - player.x, p.z - player.z);
        if (dist < minDist) {
          minDist = dist;
          tackleTarget = p;
        }
      }
    });

    if (tackleTarget) {
      const now = Date.now();
      if (room.ball.ownerId === tackleTarget.id) {
        room.ball.setOwner(player.id);
        eventEmitter.emit(EVENTS.BALL_OWNED, {
          room,
          playerId: player.id,
          fromPlayerId: tackleTarget.id,
        });
      }
      tackleTarget.stun(now);

      eventEmitter.emit(EVENTS.PLAYER_STUNNED, {
        room,
        playerId: tackleTarget.id,
        tacklerId: playerId,
      });
    }

    eventEmitter.emit(EVENTS.ACTION_TACKLE, {
      room,
      playerId,
      targetId: tackleTarget?.id,
    });

    player.state = 'tackle';
    player.lastActionTime = Date.now();
  }

  handlePass(room, playerId, direction) {
    const player = room.players[playerId];
    if (!player || room.state !== 'playing') return;
    if (!this._ensurePossessionIfClose(room, player)) return;
    if (player.state === 'stun') return;

    // 所有していなければ近距離で拾う
    if (room.ball.ownerId !== playerId) {
      const ok = this._ensurePossessionIfClose(room, player);
      if (!ok) return;
    }

    let passTarget = null;
    let minPassScore = (CONSTANTS.PASS_RANGE || 100) + 50;

    Object.values(room.players).forEach(p => {
      if (p.team === player.team && p.id !== playerId) {
        const dist = Math.hypot(p.x - player.x, p.z - player.z);
        if (dist < CONSTANTS.PASS_RANGE) {
          const targetDir = Math.atan2(p.z - player.z, p.x - player.x) * (180 / Math.PI);
          const angleDiff = Math.abs(((targetDir - direction + 180) % 360) - 180);
          const passScore = dist + angleDiff * 2;
          if (passScore < minPassScore) {
            minPassScore = passScore;
            passTarget = p;
          }
        }
      }
    });

    if (passTarget && minPassScore < (CONSTANTS.PASS_RANGE + 50)) {
      room.ball.setOwner(passTarget.id);
      eventEmitter.emit(EVENTS.BALL_OWNED, {
        room,
        playerId: passTarget.id,
        fromPlayerId: playerId,
      });
    } else {
      // ターゲットがいなければ前方へキック
      room.ball.kick(direction);
      eventEmitter.emit(EVENTS.BALL_KICKED, {
        room,
        playerId,
        direction,
      });
    }

    eventEmitter.emit(EVENTS.ACTION_PASS, {
      room,
      playerId,
      targetId: passTarget?.id,
      success: !!passTarget,
    });

    player.state = 'kick';
    player.lastActionTime = Date.now();
  }
}

module.exports = new ActionService();