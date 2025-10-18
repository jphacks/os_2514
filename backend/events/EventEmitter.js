const EventEmitter = require('events');

class GameEventEmitter extends EventEmitter {
  emit(eventType, data) {
    console.log(`[Event] ${eventType}`, data);
    super.emit(eventType, data);
  }
}

module.exports = new GameEventEmitter();