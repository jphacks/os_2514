const EventEmitter = require('events');
const debug = require('debug')('game:event');
class GameEventEmitter extends EventEmitter {
  emit(eventType, data) {
    if (eventType !== 'game:ticked') {
      debug(`[Event] ${eventType}`, data);
    }
    super.emit(eventType, data);
  }
}

module.exports = new GameEventEmitter();