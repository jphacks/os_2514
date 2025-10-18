const eventEmitter = require('../events/EventEmitter');
const EVENTS = require('../events/events');

class GameLoopService {
  constructor() {
    this.intervalId = null;
    this.rooms = new Map();
  }

  registerRoom(room) {
    this.rooms.set(room.roomId, room);
  }

  unregisterRoom(roomId) {
    this.rooms.delete(roomId);
  }

  start(tickInterval) {
    console.log(`[GameLoop] Started (interval: ${tickInterval}ms)`);

    this.intervalId = setInterval(() => {
      const now = Date.now();

      this.rooms.forEach(room => {
        if (room.state === 'playing') {
          room.tick(now);
          eventEmitter.emit(EVENTS.GAME_TICKED, {
            roomId: room.roomId,
            roomState: room.toJSON(),
          });
        }
      });
    }, tickInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[GameLoop] Stopped');
    }
  }
}

module.exports = new GameLoopService();