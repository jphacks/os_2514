const Room = require("../models/room");

class RoomManager {
  constructor(maxPlayersPerRoom = 6) {
    this.rooms = {};
    this.maxPlayersPerRoom = maxPlayersPerRoom;
    this.waitingRoom = null;
  }

  // 現在の待機中の部屋を取得、なければ新規作成
  getOrCreateWaitingRoom() {
    // 待機中の部屋が存在し、かつプレイヤー数に余裕があれば使用
    if (this.waitingRoom && this.waitingRoom.getPlayerCount() < this.maxPlayersPerRoom) {
      return this.waitingRoom;
    }

    // 新しい部屋を作成
    const roomId = "room_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const newRoom = new Room(roomId, this.maxPlayersPerRoom);
    this.rooms[roomId] = newRoom;
    this.waitingRoom = newRoom;

    console.log(`[RoomManager] New room created: ${roomId} (max: ${this.maxPlayersPerRoom})`);

    return newRoom;
  }

  // プレイヤーを部屋に追加
  addPlayerToRoom(playerId, playerName, team) {
    const room = this.getOrCreateWaitingRoom();
    const player = room.addPlayer(playerId, playerName, team);

    const playerCount = room.getPlayerCount();
    console.log(`[RoomManager] Player ${playerId} joined room ${room.roomId} (${playerCount}/${this.maxPlayersPerRoom})`);

    return { room, player };
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

  // 部屋がゲーム開始条件を満たしているか
  canStartGame(roomId) {
    const room = this.rooms[roomId];
    if (!room) return false;
    
    // 最大人数に達したか、または待機時間が一定以上か
    return room.getPlayerCount() === this.maxPlayersPerRoom;
  }

  // ゲーム開始時にチームをランダムに割り当て
  assignTeamsRandomly(roomId) {
    const room = this.rooms[roomId];
    if (!room) return;

    const players = Object.values(room.players);
    const teams = ["alpha", "bravo"];
    
    // シャッフル
    players.sort(() => Math.random() - 0.5);

    // チームを交互に割り当て
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
        maxPlayers: this.maxPlayersPerRoom
      };
    }

    return stats;
  }

  // 最大プレイヤー数を変更（ゲーム開始していない場合のみ）
  setMaxPlayersPerRoom(max) {
    if (Object.keys(this.rooms).some(id => this.rooms[id].state === "playing")) {
      console.warn("[RoomManager] Cannot change max players while games are running");
      return false;
    }
    this.maxPlayersPerRoom = max;
    // 既存の待機中ルームへも反映
    if (this.waitingRoom && this.waitingRoom.state !== "playing") {
      this.waitingRoom.maxPlayers = max;
    }
    console.log(`[RoomManager] Max players per room set to ${max}`);
    return true;
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