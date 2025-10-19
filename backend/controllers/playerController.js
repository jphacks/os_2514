const RoomService = require('../services/RoomService');

exports.getPlayerInfo = (req, res) => {
  const room = RoomService.getRoomById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const player = room.players[req.params.playerId];
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json({ success: true, player: player.toJSON() });
};