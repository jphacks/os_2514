const Room = require("../models/room");

class RoomManager {
  constructor(maxPlayersPerRoom = 6) {
    this.rooms = {};
    this.maxPlayersPerRoom = maxPlayersPerRoom;
    this.waitingRoom = null;
  }

  // ランダムマッチ用: 待機中の部屋を取得、なければ新規作成
  getOrCreateWaitingRoom() {
    if (this.waitingRoom && this.waitingRoom.getPlayerCount() < this.maxPlayersPerRoom) {
      return this.waitingRoom;
    }

    const roomId = this.generateRoomId();
    const newRoom = new Room(roomId, this.maxPlayersPerRoom, false); // isPrivate = false
    this.rooms[roomId] = newRoom;
    this.waitingRoom = newRoom;

    console.log(`[RoomManager] New waiting room created: ${roomId} (max: ${this.maxPlayersPerRoom})`);

    return newRoom;
  }

  // カスタム部屋を作成
  createCustomRoom(creatorId, creatorName, maxPlayers = this.maxPlayersPerRoom) {
    const roomId = this.generateRoomId();
    const newRoom = new Room(roomId, maxPlayers, true); // isPrivate = true
    
    // 作成者をプレイヤーとして追加（team=null）
    const player = newRoom.addPlayer(creatorId, creatorName, null);
    this.rooms[roomId] = newRoom;

    console.log(`[RoomManager] Custom room created: ${roomId} (creator: ${creatorId}, max: ${maxPlayers})`);

    return newRoom;
  }

  // プレイヤーを部屋に追加（ランダムマッチ用）
  addPlayerToRoom(playerId, playerName, team) {
    const room = this.getOrCreateWaitingRoom();
    const player = room.addPlayer(playerId, playerName, team);

    const playerCount = room.getPlayerCount();
    console.log(`[RoomManager] Player ${playerId} joined room ${room.roomId} (${playerCount}/${this.maxPlayersPerRoom})`);

    return { room, player };
  }

  // プレイヤーをカスタム部屋に追加
  addPlayerToCustomRoom(playerId, playerName, roomId) {
    const room = this.rooms[roomId];
    
    if (!room) {
      return { success: false, error: "Room not found" };
    }
    if (room.isFull()) {
      return { success: false, error: "Room is full" };
    }
    if (room.state !== "waiting") {
      return { success: false, error: "Game has already started" };
    }

    const player = room.addPlayer(playerId, playerName, null); // team=null
    const playerCount = room.getPlayerCount();

    console.log(`[RoomManager] Player ${playerId} joined custom room ${roomId} (${playerCount}/${room.maxPlayers})`);

    return { success: true, room, player };
  }

  // プレイヤーを部屋から削除
  removePlayerFromRoom(playerId) {
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      if (room.players[playerId]) {
        room.removePlayer(playerId);
        console.log(`[RoomManager] Player ${playerId} removed from room ${roomId}`);

        // 部屋が空になったら削除
        if (room.getPlayerCount() === 0) {
          delete this.rooms[roomId];
          if (this.waitingRoom === room) {
            this.waitingRoom = null;
          }
          console.log(`[RoomManager] Room ${roomId} deleted (empty)`);
        }

        return room;
      }
    }
    return null;
  }

  // 部屋IDからプレイヤーの部屋を取得
  getRoomByPlayerId(playerId) {
    for (const roomId in this.rooms) {
      if (this.rooms[roomId].players[playerId]) {
        return this.rooms[roomId];
      }
    }
    return null;
  }

  // 部屋IDで部屋を直接取得
  getRoomById(roomId) {
    return this.rooms[roomId];
  }

  // ルーム ID が存在するか確認
  roomExists(roomId) {
    return this.rooms[roomId] !== undefined;
  }

  // ゲーム開始時にチームをランダムに割り当て
  assignTeamsRandomly(roomId) {
    const room = this.rooms[roomId];
    if (!room) return;

    const players = Object.values(room.players);
    const teams = ["alpha", "bravo"];
    
    players.sort(() => Math.random() - 0.5);

    players.forEach((player, index) => {
      player.team = teams[index % teams.length];
    });

    console.log(`[RoomManager] Teams assigned for room ${roomId}`);
  }

  // すべての部屋の統計
  getStats() {
    const stats = {
      totalRooms: Object.keys(this.rooms).length,
      totalPlayers: 0,
      roomDetails: {}
    };

    for (const roomId in this.rooms) {
      const count = this.rooms[roomId].getPlayerCount();
      stats.totalPlayers += count;
      stats.roomDetails[roomId] = {
        playerCount: count,
        state: this.rooms[roomId].state,
        maxPlayers: this.rooms[roomId].maxPlayers,
        isPrivate: this.rooms[roomId].isPrivate
      };
    }

    return stats;
  }

  // 最大プレイヤー数を変更
  setMaxPlayersPerRoom(max) {
    if (Object.keys(this.rooms).some(id => this.rooms[id].state === "playing")) {
      console.warn("[RoomManager] Cannot change max players while games are running");
      return false;
    }
    this.maxPlayersPerRoom = max;
    if (this.waitingRoom && this.waitingRoom.state !== "playing") {
      this.waitingRoom.maxPlayers = max;
    }
    console.log(`[RoomManager] Max players per room set to ${max}`);
    return true;
  }

  // ルームID生成ユーティリティ
  generateRoomId() {
    return "room_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // 部屋情報を取得（プレイヤー情報なし）
  getRoomInfo(roomId) {
    const room = this.rooms[roomId];
    if (!room) return null;

    return {
      roomId: room.roomId,
      state: room.state,
      playerCount: room.getPlayerCount(),
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      players: Object.values(room.players).map(p => ({
        id: p.id,
        name: p.name,
        team: p.team
      }))
    };
  }
}

// シングルトンパターン
let roomManagerInstance = null;

module.exports = {
  getInstance: (maxPlayersPerRoom = 6) => {
    if (!roomManagerInstance) {
      roomManagerInstance = new RoomManager(maxPlayersPerRoom);
    }
    return roomManagerInstance;
  },
  
  setInstance: (instance) => {
    roomManagerInstance = instance;
  },

  RoomManager
};