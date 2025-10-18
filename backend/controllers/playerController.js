const Room = require("../services/room");
const room = Room.getInstance();

exports.join = (req, res) => {
  const { name, team } = req.body || {};
  const id = "p_" + Math.floor(Math.random() * 10000);
  const player = room.addPlayer(id, name ?? "Unknown", team ?? "alpha");
  res.json({ success: true, player: player.toJSON() });
};

exports.getPlayerInfo = (req, res) => {
  const player = room.players[req.params.id];
  if (player) res.json(player.toJSON());
  else res.status(404).json({ error: "Player not found" });
};