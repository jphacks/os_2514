const WebSocket = require("ws");
const Room = require("./room");
const room = Room.getInstance();
const constants = require("../config/constants");

const TICK_INTERVAL = constants.TICK_INTERVAL || 50;

module.exports = (wss) => {
  wss.on("connection", ws => {
    console.log("WS connected");

    ws.on("message", msg => {
      let data;
      try { 
        data = JSON.parse(msg); 
      } catch { 
        return; 
      }

      const { type, payload } = data;
      const playerId = ws.playerId;

      switch(type) {
        // join: 初回参加
        case "join":
          const id = "p_" + Math.floor(Math.random() * 10000);
          ws.playerId = id;
          room.addPlayer(id, payload.name, payload.team);
          
          // Redis: playerId をキーに位置情報を初期化
          
          ws.send(JSON.stringify({ 
            type: "joinAck", 
            payload: { playerId: id } 
          }));
          console.log(`Player joined: ${id}, name: ${payload.name}, team: ${payload.team}`);
          break;

        // update: 位置・状態の更新
        case "update":
          if (playerId) {
            // Redis: 位置情報をRedisに保存（他のサーバーインスタンスと同期）
            
            room.updatePlayer(playerId, payload);
          }
          break;

        // action: アクション処理
        case "action":
          if (playerId) {
            room.handleAction(playerId, payload);
          }
          break;

        // leave: 離脱
        case "leave":
          if (playerId) {
            room.removePlayer(playerId);
            
            // Redis: 削除されたプレイヤーの位置情報をクリア
          }
          break;

        // control: ゲーム操作
        case "control":
          if (payload.command === "startGame") {
            room.startGame();
          } else if (payload.command === "endGame") {
            room.endGame();
            // DB: ここでマッチ結果をDBに保存
          } else if (payload.command === "restart") {
            room.restart();
          }
          break;

        default:
          console.log("Unknown message type:", type);
      }
    });

    // 接続完了時に部屋の状態を送る
    ws.send(JSON.stringify({ 
      type: "roomState", 
      payload: room.toJSON() 
    }));

    // 切断時
    ws.on("close", () => {
      if (ws.playerId) {
        room.removePlayer(ws.playerId);
        
        // Redis: 削除されたプレイヤーの位置情報をクリア
        
        console.log(`Player disconnected: ${ws.playerId}`);
      }
    });
  });

  // tick: 50msごとに全体状態を同期
  setInterval(() => {
    // Redis: 全プレイヤーの位置情報をRedisから読み込む
    
    room.tick();
    const stateMsg = JSON.stringify({ 
      type: "tick", 
      payload: room.toJSON() 
    });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(stateMsg);
      }
    });
  }, TICK_INTERVAL);
};