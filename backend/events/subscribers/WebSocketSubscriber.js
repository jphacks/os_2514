const Logger = require('../../utils/Logger');
const eventEmitter = require('../EventEmitter');
const EVENTS = require('../events/events');

class WebSocketSubscriber {
  static subscribe() {
    eventEmitter.on(EVENTS.BALL_KICKED, ({ room, playerId, direction }) => {
      Logger.debug('WebSocketSubscriber: Ball kicked', {
        roomId: room.roomId,
        playerId,
        direction,
      });
    });

    eventEmitter.on(EVENTS.BALL_OWNED, ({ room, playerId, fromPlayerId }) => {
      Logger.debug('WebSocketSubscriber: Ball owned', {
        roomId: room.roomId,
        playerId,
        fromPlayerId,
      });
    });

    eventEmitter.on(EVENTS.ACTION_TACKLE, ({ room, playerId, targetId }) => {
      Logger.debug('WebSocketSubscriber: Tackle action', {
        roomId: room.roomId,
        playerId,
        targetId,
      });
    });

    eventEmitter.on(EVENTS.ACTION_PASS, ({ room, playerId, targetId, success }) => {
      Logger.debug('WebSocketSubscriber: Pass action', {
        roomId: room.roomId,
        playerId,
        targetId,
        success,
      });
    });

    Logger.info('WebSocketSubscriber initialized');
  }
}

module.exports = WebSocketSubscriber;