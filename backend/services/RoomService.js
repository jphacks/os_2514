const Room = require('../models/Room');
const Player = require('../models/Player');
const eventEmitter = require('../events/EventEmitter');
const EVENTS = require('../events/events');

class RoomService {
  constructor() {
    this.rooms = {};
    this.playerToRoom = {};
    this.waitingRoom = null;
  }

  joinRandomMatch(playerId, playerName) {
    let room = this.waitingRoom;

    if (!room || room.isFull()) {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      room = new Room(roomId);
      this.rooms[roomId] = room;
      this.waitingRoom = room;
    }

    const player = new Player(playerId, playerName);
    room.addPlayer(player);
    this.playerToRoom[playerId] = room.roomId;

    eventEmitter.emit(EVENTS.PLAYER_JOINED, { room, playerId, playerName });

    if (room.isFull()) {
      this.startMatching(room.roomId);
    }

    return room;
  }

  createPrivateRoom(creatorId, creatorName, maxPlayers) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = new Room(roomId, maxPlayers, true);

    const player = new Player(creatorId, creatorName);
    room.addPlayer(player);
    this.rooms[roomId] = room;
    this.playerToRoom[creatorId] = roomId;

    return room;
  }

  joinPrivateRoom(roomId, playerId, playerName) {
    const room = this.rooms[roomId];
    if (!room) throw new Error('Room not found');
    if (room.isFull()) throw new Error('Room is full');
    if (room.state !== 'waiting') throw new Error('Game already started');

    const player = new Player(playerId, playerName);
    room.addPlayer(player);
    this.playerToRoom[playerId] = roomId;

    eventEmitter.emit(EVENTS.PLAYER_JOINED, { room, playerId, playerName });

    if (room.isFull()) {
      this.startMatching(room.roomId);
    }

    return room;
  }

  getRoomByPlayerId(playerId) {
    const roomId = this.playerToRoom[playerId];
    return roomId ? this.rooms[roomId] : null;
  }

  getRoomById(roomId) {
    return this.rooms[roomId] || null;
  }

  removePlayer(playerId) {
    const roomId = this.playerToRoom[playerId];
    if (!roomId) return null;

    const room = this.rooms[roomId];
    room.removePlayer(playerId);
    delete this.playerToRoom[playerId];

    eventEmitter.emit(EVENTS.PLAYER_LEFT, { room, playerId });

    if (room.getPlayerCount() === 0) {
      delete this.rooms[roomId];
      if (this.waitingRoom?.roomId === roomId) {
        this.waitingRoom = null;
      }
    }

    return room;
  }

  startMatching(roomId) {
    const room = this.rooms[roomId];
    if (!room) return;

    room.state = 'matching';
    this.assignTeamsRandomly(room);
    eventEmitter.emit(EVENTS.GAME_STARTED, { room });
  }

  assignTeamsRandomly(room) {
    const players = Object.values(room.players);
    players.sort(() => Math.random() - 0.5);

    players.forEach((player, index) => {
      player.team = index % 2 === 0 ? 'alpha' : 'bravo';
    });
  }

  getStats() {
    return {
      totalRooms: Object.keys(this.rooms).length,
      totalPlayers: Object.keys(this.playerToRoom).length,
    };
  }
}

module.exports = new RoomService();