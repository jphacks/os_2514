const EventEmitter = require('events');

class GameEventEmitter extends EventEmitter {
  emit(eventType, data) {
    if (eventType !== 'game:ticked') {
      console.log(`[Event] ${eventType}`, data);
    }
    super.emit(eventType, data);
  }
}

module.exports = new GameEventEmitter();