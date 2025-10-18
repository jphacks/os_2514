const express = require("express");
const router = express.Router();
const playerController = require("../controllers/playerController");
const roomController = require("../controllers/roomController");
const matchController = require("../controllers/matchController");

// Room API
router.get("/room", roomController.getRoom);
router.post("/room/start", roomController.startGame);
router.post("/room/end", roomController.endGame);

// Player API
router.post("/player/join", playerController.join);
router.get("/player/:id", playerController.getPlayerInfo);

// Match API
router.post("/match/save", matchController.saveMatchResult);

module.exports = router;
