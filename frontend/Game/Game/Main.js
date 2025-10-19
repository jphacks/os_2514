import * as THREE from "three";
import PlayerModel from "../Player/PlayerModel.js";
import PlayerView from "../Player/PlayerView.js";
import PlayerPresenter from "../Player/PlayerPresenter.js";
import BallModel from "../Ball/BallModel.js";
import BallView from "../Ball/BallView.js";
import BallPresenter from "../Ball/BallPresenter.js";
import InputHandler from "../Input/InputHandler.js";
import Joystick from "../Input/Joystick.js";
import Match from "./Match.js";
import { PlayerStates } from "../ConstData/PlayerStates.js";
import * as C from "../ConstData/Constants.js";

// =================================================================================
// エントリーポイント (main.js)
// 責務：アプリケーションの起動、3Dシーンのセットアップ、
//       メインオブジェクト(Match)の生成、ゲームループの実行。
// =================================================================================

// --- 3Dシーンの基本設定 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- ライティング ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, -10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// --- 入力ハンドラのインスタンス化 ---
const keyboard = new InputHandler();
const joystick = new Joystick("joystick-container", "joystick-thumb");

// --- ゲームのメインオブジェクトを生成 ---
const match = new Match(scene);
const clock = new THREE.Clock();

const resultModal = document.getElementById('result-modal');
const resultMessage = document.getElementById('result-message');
const resultResetButton = document.getElementById('result-reset-button');

keyboard.onKeyDown("Space", () => match.beginKickCharge());
keyboard.onKeyUp("Space", () => match.endKickCharge());

if (resultResetButton) {
    resultResetButton.addEventListener('click', () => {
        hideResultModal();
        match.start({ resetScore: true, resetTime: true });
    });
}

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  const userPlayer = match.getUserPlayer();
  if (!userPlayer) return;

  switch (data.type) {
    case "kick":
      console.log("[FingerTracking] kick received:", data);
      userPlayer.model.setState(PlayerStates.Kick);
      userPlayer.resetVec();
      match.endKickCharge();
      break;
    case "run":
      console.log("[FingerTracking] run received:", data);
      userPlayer.model.setState(PlayerStates.Run);
    //   userPlayer.model.setVelocity(new THREE.Vector3(0, 0, C.PLAYER_SPEED));
      // PlayerPresenterのmoveForwardを呼び出す
      if (typeof userPlayer.moveForward === "function") {
        userPlayer.moveForward();
        break;
      }
      userPlayer.resetVec();
      break;
    case "charge":
      console.log("[FingerTracking] charge received:", data);
      match.beginKickCharge();
      userPlayer.model.setState(PlayerStates.Charge);
      userPlayer.model.setCharging(true);
      userPlayer.resetVec();
      break;
    case "idle":
      console.log("[FingerTracking] idle received:", data);
      userPlayer.model.setState(PlayerStates.Idle);
      userPlayer.resetVec();
      userPlayer.model.setCharging(false);
      break;
    default:
      // 他のイベントは無視
      break;
  }
});

// ミニマップ描画
function drawMinimap() {
  const container = document.getElementById("minimap");
  const canvas = document.getElementById("minimap-canvas");
  if (!container || !canvas) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.max(1, container.clientWidth);
  const cssH = Math.max(1, container.clientHeight);
  const needResize = canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr);
  if (needResize) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  // 既存の定数・状態をそのまま利用（C と match がスコープにある前提）
  const fieldW = C.FIELD_WIDTH ?? C.CANVAS_WIDTH;
  const fieldH = C.FIELD_HEIGHT ?? C.CANVAS_HEIGHT;

  const margin = 10;
  let mapW, mapH;
  if (fieldW >= fieldH) {
    mapW = cssW - margin * 2;
    mapH = mapW * (fieldH / fieldW);
    if (mapH > cssH - margin * 2) {
      mapH = cssH - margin * 2;
      mapW = mapH * (fieldW / fieldH);
    }
  } else {
    mapH = cssH - margin * 2;
    mapW = mapH * (fieldW / fieldH);
    if (mapW > cssW - margin * 2) {
      mapW = cssW - margin * 2;
      mapH = mapW * (fieldH / fieldW);
    }
  }

  const originX = (cssW - mapW) / 2;
  const originY = (cssH - mapH) / 2;

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(originX, originY, mapW, mapH);

  function toMinimap(x, z) {
    const normX = 1 - (x + fieldW / 2) / fieldW;
    const normZ = 1 - (z + fieldH / 2) / fieldH;
    return { x: originX + normX * mapW, y: originY + normZ * mapH };
  }

  // プレイヤー・ボールの位置を描画
  const players = match.players ?? [];
  players.forEach((p) => {
    const pos = p.model.getPosition();
    const { x, y } = toMinimap(pos.x, pos.z);
    ctx.fillStyle = p.model.getTeam() === "alpha" ? "#f44" : "#44f";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  if (match.ballPresenter) {
    const pos = match.ballPresenter.model.getPosition();
    const { x, y } = toMinimap(pos.x, pos.z);
    ctx.fillStyle = "#ff0";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- ゲームループ ---
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // --- 入力状態の収集 ---
  const input = {
    joystick: joystick.getState(),
    keys: keyboard.getState(),
  };

  // --- Matchオブジェクトの更新 ---
  // ゲームの全てのロジックはMatchクラスに委譲
  match.update(delta, {
    keys: input.keys,
    joystick: input.joystick,
  });

  // --- 描画 ---
  const playerToFollow = match.getUserPlayer();
  if (playerToFollow) {
    // カメラ更新
    const offset = new THREE.Vector3(0, 10, -15);
    offset.applyQuaternion(playerToFollow.model.getQuaternion());
    const targetPosition = playerToFollow.model.getPosition().add(offset);
    camera.position.lerp(targetPosition, 0.08);
    camera.lookAt(playerToFollow.model.getPosition());
  }

  renderer.render(scene, camera);

  // ミニマップ描画
  drawMinimap();

  requestAnimationFrame(animate);
}

function showResultModal(winner, score) {
    if (!resultModal || !resultMessage) return;
    let msg = '';
    if (score.alpha > score.bravo) {
        msg = `アルファチームの勝ち！ (${score.alpha} - ${score.bravo})`;
    } else if (score.alpha < score.bravo) {
        msg = `ブラボーチームの勝ち！ (${score.alpha} - ${score.bravo})`;
    } else {
        msg = `引き分け！ (${score.alpha} - ${score.bravo})`;
    }
    resultMessage.textContent = msg;
    resultModal.style.display = 'flex';
}

function hideResultModal() {
    if (resultModal) resultModal.style.display = 'none';
}

// MatchクラスのhandleTimeUpをフック
const originalHandleTimeUp = match.handleTimeUp.bind(match);
match.handleTimeUp = function () {
    originalHandleTimeUp();
    showResultModal(null, this.score);
};

animate();
