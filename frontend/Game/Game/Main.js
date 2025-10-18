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
import { PlayerStates } from '../ConstData/PlayerStates.js';
import * as C from '../ConstData/Constants.js';

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

keyboard.onKeyDown("Space", () => match.beginKickCharge());
keyboard.onKeyUp("Space", () => match.endKickCharge());

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  const userPlayer = match.getUserPlayer();
  if (!userPlayer) return;

  switch (data.type) {
    case "kick":
      console.log("[FingerTracking] kick received:", data);
      userPlayer.model.setState(PlayerStates.Kick);
      match.endKickCharge();
      break;
    case "run":
      console.log("[FingerTracking] run received:", data);
      userPlayer.model.setState(PlayerStates.Run);
      userPlayer.model.setVelocity(new THREE.Vector3(0, 0, C.PLAYER_SPEED));
      break;
    case "charge":
      console.log("[FingerTracking] charge received:", data);
      match.beginKickCharge();
      userPlayer.model.setState(PlayerStates.Charge);
      userPlayer.model.setCharging(true);
      userPlayer.model.setVelocity(new THREE.Vector3(0, 0, 0));
      break;
    case "idle":
      console.log("[FingerTracking] idle received:", data);
      userPlayer.model.setState(PlayerStates.Idle);
      userPlayer.model.setVelocity(new THREE.Vector3(0, 0, 0));
      userPlayer.model.setCharging(false);
      break;
    default:
      // 他のイベントは無視
      break;
  }
});

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
}

animate();
