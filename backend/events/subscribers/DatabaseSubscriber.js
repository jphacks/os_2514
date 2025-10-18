const Logger = require('../../utils/Logger');
const eventEmitter = require('../EventEmitter');
const EVENTS = require('../events');

class DatabaseSubscriber {
  static subscribe() {
    eventEmitter.on(EVENTS.PLAYER_JOINED, ({ room, playerId, playerName }) => {
      Logger.debug('DatabaseSubscriber: Player joined', {
        roomId: room.roomId,
        playerId,
        playerName,
      });
    });

    eventEmitter.on(EVENTS.PLAYER_LEFT, ({ room, playerId }) => {
      Logger.debug('DatabaseSubscriber: Player left', {
        roomId: room.roomId,
        playerId,
      });
    });

    eventEmitter.on(EVENTS.GAME_ENDED, ({ room }) => {
      Logger.info('DatabaseSubscriber: Will save match result', {
        roomId: room.roomId,
        score: room.score,
      });
    });

    Logger.info('DatabaseSubscriber initialized');
  }
}

module.exports = DatabaseSubscriber;