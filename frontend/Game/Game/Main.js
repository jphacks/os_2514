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

// --- カメラシェイク用変数 ---
let cameraShake = { time: 0, intensity: 0 };
function triggerCameraShake(intensity, duration) {
  cameraShake.intensity = intensity;
  cameraShake.time = duration;
}
window.triggerCameraShake = triggerCameraShake;

// --- ゴールパーティクル ---
window.createGoalParticles = function (team) {
  const color = team === "alpha" ? 0xff4141 : 0x4195ff;
  const particleCount = 40;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];
  for (let i = 0; i < particleCount; i++) {
    positions.push(0, 10, 0); // ゴール中央
    velocities.push(
      (Math.random() - 0.5) * 20,
      Math.random() * 15,
      (Math.random() - 0.5) * 20
    );
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  const material = new THREE.PointsMaterial({
    color,
    size: 1.2,
    transparent: true,
  });
  const points = new THREE.Points(geometry, material);
  points.userData = { velocities, life: 1.2 };
  scene.add(points);
  function animateParticles() {
    points.userData.life -= 0.03;
    if (points.userData.life <= 0) {
      scene.remove(points);
      return;
    }
    const pos = points.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] += points.userData.velocities[i * 3] * 0.03;
      pos[i * 3 + 1] += points.userData.velocities[i * 3 + 1] * 0.03;
      pos[i * 3 + 2] += points.userData.velocities[i * 3 + 2] * 0.03;
    }
    points.geometry.attributes.position.needsUpdate = true;
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
};

// --- 入力ハンドラのインスタンス化 ---
const keyboard = new InputHandler();
const joystick = new Joystick("joystick-container", "joystick-thumb");

// --- ゲームのメインオブジェクトを生成 ---
const match = new Match(scene);
const clock = new THREE.Clock();

// --- UI要素取得 ---
const resultModal = document.getElementById("result-modal");
const resultMessage = document.getElementById("result-message");
const resultResetButton = document.getElementById("result-reset-button");

// --- サウンドエフェクト（Tone.js利用） ---
let soundsReady = false;
let kickSound, goalSound, wallHitSound, tackleSound;
function initSounds() {
  kickSound = new window.Tone.MembraneSynth().toDestination();
  goalSound = new window.Tone.PolySynth(window.Tone.Synth).toDestination();
  wallHitSound = new window.Tone.PluckSynth().toDestination();
  tackleSound = new window.Tone.NoiseSynth().toDestination();
}
window.addEventListener("DOMContentLoaded", async () => {
  if (!soundsReady && window.Tone) {
    await window.Tone.start();
    initSounds();
    soundsReady = true;
  }
});
window.goalSound = goalSound;
window.kickSound = kickSound;

// --- 入力イベント ---
keyboard.onKeyDown("Space", () => match.beginKickCharge());
keyboard.onKeyUp("Space", () => match.endKickCharge());

if (resultResetButton) {
  resultResetButton.addEventListener("click", () => {
    hideResultModal();
    match.start({ resetScore: true, resetTime: true });
  });
}

// --- 指トラッキング連携 ---
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  const userPlayer = match.getUserPlayer();
  if (!userPlayer) return;

  switch (data.type) {
    case "kick":
      userPlayer.model.setState(PlayerStates.Kick);
      userPlayer.resetVec();
      match.endKickCharge();
      if (soundsReady) kickSound.triggerAttackRelease("C2", "8n");
      triggerCameraShake(0.8, 0.2);
      match.ui.showStatus("キック！", 800);
      break;
    case "run":
      userPlayer.model.setState(PlayerStates.Run);
      if (typeof userPlayer.moveForward === "function") {
        userPlayer.moveForward();
      }
      triggerCameraShake(0.2, 0.1);
      match.ui.showStatus("ダッシュ！", 600);
      break;
    case "charge":
      match.beginKickCharge();
      userPlayer.model.setState(PlayerStates.Charge);
      userPlayer.model.setCharging(true);
      userPlayer.resetVec();
      match.ui.showStatus("チャージ中...", 1000);
      break;
    case "idle":
      userPlayer.model.setState(PlayerStates.Idle);
      userPlayer.resetVec();
      userPlayer.model.setCharging(false);
      match.ui.showStatus("待機", 600);
      break;
    default:
      break;
  }
});

// --- レスポンシブ対応: ミニマップcanvasのリサイズ ---
function resizeMinimapCanvas() {
  const canvas = document.getElementById("minimap-canvas");
  const parent = canvas?.parentElement;
  if (!canvas || !parent) return;
  // 親要素のサイズを取得
  const rect = parent.getBoundingClientRect();
  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}
window.addEventListener('DOMContentLoaded', resizeMinimapCanvas);
window.addEventListener('resize', resizeMinimapCanvas);

// --- レスポンシブ対応: 指トラッキング画面のcanvasリサイズ（必要なら） ---
function resizeFingerTrackingCanvas() {
  const pane = document.getElementById('finger-tracking-pane');
  const canvas = document.getElementById('finger-canvas');
  if (!pane || !canvas) return;
  const rect = pane.getBoundingClientRect();
  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}
window.addEventListener('DOMContentLoaded', resizeFingerTrackingCanvas);
window.addEventListener('resize', resizeFingerTrackingCanvas);

// ミニマップ描画
function drawMinimap() {
  const canvas = document.getElementById("minimap-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ステージサイズ
  const fieldW = C.FIELD_WIDTH;
  const fieldH = C.FIELD_HEIGHT;

  // ミニマップサイズをフィールドの比率に合わせて調整
  const margin = Math.round(canvas.width * 0.06);
  const mapW = canvas.width - margin * 2;
  const mapH = canvas.height - margin * 2;

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, mapW, mapH);

  // 座標変換関数
  function toMinimap(x, z) {
    const normX = (x + fieldW / 2) / fieldW;
    const normZ = (z + fieldH / 2) / fieldH;
    return {
      x: margin + normX * mapW,
      y: margin + normZ * mapH,
    };
  }

  // プレイヤー・ボール描画（省略: 既存ロジックをそのまま）
  const players = match.players ?? [];
  players.forEach((player) => {
    const pos = player.model.getPosition();
    const { x, y } = toMinimap(pos.x, pos.z);
    ctx.fillStyle = player.model.getTeam() === "alpha" ? "#f44" : "#44f";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(6, mapW * 0.03), 0, Math.PI * 2);
    ctx.fill();
  });

  if (match.ballPresenter) {
    const ballPos = match.ballPresenter.model.getPosition();
    const { x, y } = toMinimap(ballPos.x, ballPos.z);
    ctx.fillStyle = "#ff0";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(4, mapW * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
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

  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.classList.add("hidden");
  }

  // --- Matchオブジェクトの更新 ---
  match.update(delta, {
    keys: input.keys,
    joystick: input.joystick,
  });

  // --- カメラワーク ---
  const playerToFollow = match.getUserPlayer();
  if (playerToFollow) {
    const offset = new THREE.Vector3(0, 10, -15);
    offset.applyQuaternion(playerToFollow.model.getQuaternion());
    const targetPosition = playerToFollow.model.getPosition().add(offset);
    camera.position.lerp(targetPosition, 0.08);
    camera.lookAt(playerToFollow.model.getPosition());

    // --- カメラシェイク ---
    if (cameraShake.time > 0) {
      cameraShake.time -= delta;
      camera.position.x += (Math.random() - 0.5) * cameraShake.intensity;
      camera.position.y += (Math.random() - 0.5) * cameraShake.intensity;
    }
  }

  renderer.render(scene, camera);

  // ミニマップ描画
  drawMinimap();
}

// --- 統合UI: 結果モーダル ---
function showResultModal(winner, score) {
  if (!resultModal || !resultMessage) return;
  let msg = "";
  if (score.alpha > score.bravo) {
    msg = `アルファチームの勝ち！ (${score.alpha} - ${score.bravo})`;
    if (soundsReady) goalSound.triggerAttackRelease(["C4", "E4", "G4"], "0.5");
    window.createGoalParticles("alpha");
    triggerCameraShake(1.2, 0.5);
    match.ui.showStatus("アルファチームの勝利！", 2000);
  } else if (score.alpha < score.bravo) {
    msg = `ブラボーチームの勝ち！ (${score.alpha} - ${score.bravo})`;
    if (soundsReady) goalSound.triggerAttackRelease(["G4", "B4", "D5"], "0.5");
    window.createGoalParticles("bravo");
    triggerCameraShake(1.2, 0.5);
    match.ui.showStatus("ブラボーチームの勝利！", 2000);
  } else {
    msg = `引き分け！ (${score.alpha} - ${score.bravo})`;
    if (soundsReady) goalSound.triggerAttackRelease(["E4", "G4"], "0.5");
    triggerCameraShake(0.6, 0.3);
    match.ui.showStatus("引き分け！", 2000);
  }
  resultMessage.textContent = msg;
  resultModal.style.display = "flex";
}

window.showResultModal = showResultModal;

function hideResultModal() {
  if (resultModal) resultModal.style.display = "none";
}

// MatchクラスのhandleTimeUpをフック
const originalHandleTimeUp = match.handleTimeUp.bind(match);
match.handleTimeUp = function () {
  originalHandleTimeUp();
  showResultModal(null, this.score);
};

animate();