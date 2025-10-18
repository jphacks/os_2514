const Room = require("../services/room");
const room = Room.getInstance();

exports.getRoom = (_, res) => {
  res.json(room.toJSON());
};

exports.startGame = (_, res) => {
  room.startGame();
  res.json({ success: true, room: room.toJSON() });
};

exports.endGame = (_, res) => {
  room.endGame();
  res.json({ success: true, room: room.toJSON() });
};
