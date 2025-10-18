const WebSocket = require("ws");
const roomManagerModule = require("./roomManager");
const constants = require("../config/constants");
const redisService = require("./redisService");
const dbService = require("./dbService");

const TICK_INTERVAL = constants.TICK_INTERVAL || 50;
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS_PER_ROOM, 10) || 6;

// マッチングシステムの初期化
const roomManager = roomManagerModule.getInstance(MAX_PLAYERS_PER_ROOM);

module.exports = (wss) => {
  // クライアント接続
  wss.on("connection", ws => {
    console.log("WS connected");

    ws.on("message", async msg => {
      let data;
      try { 
        data = JSON.parse(msg); 
      } catch { 
        return; 
      }

      const { type, payload } = data;
      const playerId = ws.playerId;
      const room = ws.room;

      switch(type) {
        // join: 初回参加
        case "join":
          const id = "p_" + Math.floor(Math.random() * 10000);
          ws.playerId = id;
          
          // マッチングシステムでプレイヤーを追加
          const { room: joinedRoom, player } = roomManager.addPlayerToRoom(
            id, 
            payload.name || "Unknown", 
            payload.team || "alpha"
          );
          
          ws.room = joinedRoom;
          ws.roomId = joinedRoom.roomId;
          
          // クライアントに参加確認を送信
          ws.send(JSON.stringify({ 
            type: "joinAck", 
            payload: { 
              playerId: id,
              roomId: joinedRoom.roomId,
              playerCount: joinedRoom.getPlayerCount(),
              maxPlayers: joinedRoom.maxPlayers
            } 
          }));
          
          console.log(`[${joinedRoom.roomId}] Player joined: ${id}, name: ${payload.name}`);
          
          // 最大人数に達したか確認
          if (joinedRoom.isFull()) {
            console.log(`[${joinedRoom.roomId}] Room is full! Starting matching...`);
            joinedRoom.startMatching();
            
            // チームをランダムに割り当て
            roomManager.assignTeamsRandomly(joinedRoom.roomId);
            
            // すべてのクライアントに状態を通知
            broadcastToRoom(joinedRoom, {
              type: "matchingComplete",
              payload: joinedRoom.toJSON()
            });
            
            // 自動的にゲーム開始
            setTimeout(async () => {
              await joinedRoom.startGame();
              broadcastToRoom(joinedRoom, {
                type: "gameStart",
                payload: joinedRoom.toJSON()
              });
            }, 1000); // マッチング表示用に1秒待機
          } else {
            // 待機中のプレイヤーに更新を通知
            broadcastToRoom(joinedRoom, {
              type: "playerJoined",
              payload: {
                roomId: joinedRoom.roomId,
                playerCount: joinedRoom.getPlayerCount(),
                maxPlayers: joinedRoom.maxPlayers,
                players: Object.values(joinedRoom.players).map(p => ({
                  id: p.id,
                  name: p.name,
                  team: p.team
                }))
              }
            });
          }
          break;

        // update: 位置・状態の更新
        case "update":
          if (playerId && room) {
            // Roomの状態を更新
            room.updatePlayer(playerId, payload);

            // Redis: 位置情報をRedisに保存（他のサーバーインスタンスと同期）
            await redisService.setPlayerPosition(
              playerId,
              payload.x || room.players[playerId]?.x,
              payload.z || room.players[playerId]?.z,
              payload.direction || room.players[playerId]?.direction,
              payload.state || room.players[playerId]?.state
            );
          }
          break;

        // action: アクション処理
        case "action":
          if (playerId && room) {
            room.handleAction(playerId, payload);
          }
          break;

        // leave: 離脱
        case "leave":
          if (playerId) {
            const leftRoom = roomManager.removePlayerFromRoom(playerId);
            console.log(`[${leftRoom?.roomId || "unknown"}] Player left: ${playerId}`);
            
            // Redis: 削除されたプレイヤーの位置情報をクリア
            await redisService.deletePlayerPosition(playerId);
            
            ws.room = null;
            ws.roomId = null;
          }
          break;

        // control: ゲーム操作
        case "control":
          if (room) {
            if (payload.command === "startGame") {
              await room.startGame();
              broadcastToRoom(room, {
                type: "gameStart",
                payload: room.toJSON()
              });
            } else if (payload.command === "endGame") {
              try {
                // awaitを追加してエラーハンドリング
                const result = await room.endGame();
                
                broadcastToRoom(room, {
                  type: "gameEnd",
                  payload: {
                    ...room.toJSON(),
                    matchId: result.matchId
                  }
                });
                
                console.log(`✅ Game ended and saved: Match ID ${result.matchId}`);
              } catch (error) {
                console.error("❌ Failed to end game:", error);
                
                // エラーをクライアントに通知
                broadcastToRoom(room, {
                  type: "error",
                  payload: {
                    message: "Failed to save match result"
                  }
                });
              }
            } else if (payload.command === "restart") {
              room.restart();
              broadcastToRoom(room, {
                type: "gameRestart",
                payload: room.toJSON()
              });
            }
          }
          break;

        default:
          console.log("Unknown message type:", type);
      }
    });

    // 接続完了時は何も送らない（joinを待つ）

    // 切断時
    ws.on("close", async () => {
      if (ws.playerId && ws.room) {
        roomManager.removePlayerFromRoom(ws.playerId);
        
        // Redis: 切断時もプレイヤーの位置情報を削除
        await redisService.deletePlayerPosition(ws.playerId);
        
        console.log(`[${ws.roomId}] Player disconnected: ${ws.playerId}`);
      }
    });
  });

  // tick: 50msごとに全体状態を同期
  setInterval(async () => {
    try {
      // Redis: 全プレイヤーの位置情報をRedisから読み込む
      const redisPositions = await redisService.getAllPositions();

      // すべての部屋でtickを実行
      for (const roomId in roomManager.rooms) {
        const room = roomManager.rooms[roomId];
        
        // Redis: Redisの位置情報でRoomを更新（定期的な同期）
        room.updateFromRedis(redisPositions);
        
        room.tick();
        
        // ゲーム中の場合のみ状態を配信
        if (room.state === "playing") {
          const stateMsg = JSON.stringify({ 
            type: "tick", 
            payload: room.toJSON() 
          });
          
          broadcastToRoom(room, stateMsg);
        }
      }
    } catch (error) {
      console.error("❌ Tick loop error:", error);
    }
  }, TICK_INTERVAL);

  // ヘルパー関数: 特定の部屋のすべてのクライアントにメッセージを送信
  function broadcastToRoom(room, message) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    wss.clients.forEach(client => {
      if (client.roomId === room.roomId && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // 統計情報エンドポイント用
  module.exports.getRoomStats = () => roomManager.getStats();
  module.exports.setMaxPlayersPerRoom = (max) => roomManager.setMaxPlayersPerRoom(max);
};