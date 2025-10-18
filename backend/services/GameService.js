const Logger = require('../utils/Logger');
const eventEmitter = require('../events/EventEmitter');
const EVENTS = require('../events/events');
const CONSTANTS = require('../config/constants');

class GameService {
  startGame(room) {
    if (room.state !== 'matching') {
      throw new Error('Room is not in matching state');
    }

    room.state = 'playing';
    room.resetPositions();
    room.timeLeft = CONSTANTS.GAME_DURATION;

    Logger.info('Game started', { roomId: room.roomId });
    eventEmitter.emit(EVENTS.GAME_STARTED, { room });

    return room;
  }

  endGame(room) {
    if (room.state !== 'playing' && room.state !== 'finished') {
      throw new Error('Game is not in progress');
    }

    room.state = 'finished';
    Logger.info('Game ended', {
      roomId: room.roomId,
      score: room.score,
    });

    eventEmitter.emit(EVENTS.GAME_ENDED, { room });

    return {
      roomId: room.roomId,
      score: room.score,
      duration: CONSTANTS.GAME_DURATION - room.timeLeft,
    };
  }

  restartGame(room) {
    room.state = 'playing';
    room.timeLeft = CONSTANTS.GAME_DURATION;
    room.score = { alpha: 0, bravo: 0 };
    room.resetPositions();

    Logger.info('Game restarted', { roomId: room.roomId });

    return room;
  }

  getGameStats(room) {
    return {
      roomId: room.roomId,
      state: room.state,
      score: room.score,
      timeLeft: room.timeLeft,
      playerCount: room.getPlayerCount(),
      players: Object.values(room.players).map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        state: p.state,
        position: { x: p.x, z: p.z },
      })),
      ball: {
        position: { x: room.ball.x, z: room.ball.z },
        ownerId: room.ball.ownerId,
      },
    };
  }
}

module.exports = new GameService();