const Logger = require('../../utils/Logger');
const eventEmitter = require('../EventEmitter');
const EVENTS = require('../events');

class GameEventSubscriber {
  static subscribe() {
    eventEmitter.on(EVENTS.GAME_STARTED, ({ room }) => {
      Logger.info('GameEventSubscriber: Game started', {
        roomId: room.roomId,
        players: Object.keys(room.players).length,
      });
    });

    eventEmitter.on(EVENTS.GAME_ENDED, ({ room }) => {
      Logger.info('GameEventSubscriber: Game ended', {
        roomId: room.roomId,
        winner: room.score.alpha > room.score.bravo ? 'alpha' : 'bravo',
        score: room.score,
      });
    });

    eventEmitter.on(EVENTS.GOAL_SCORED, ({ room, team }) => {
      Logger.info('GameEventSubscriber: Goal scored', {
        roomId: room.roomId,
        team,
        score: room.score,
      });
    });

    eventEmitter.on(EVENTS.PLAYER_STUNNED, ({ room, playerId, tacklerId }) => {
      Logger.debug('GameEventSubscriber: Player stunned', {
        roomId: room.roomId,
        playerId,
        tacklerId,
      });
    });

    Logger.info('GameEventSubscriber initialized');
  }
}

module.exports = GameEventSubscriber;