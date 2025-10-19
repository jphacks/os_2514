import * as THREE from "three";
import PlayerModel from "../Player/PlayerModel.js";
import PlayerView from "../Player/PlayerView.js";
import PlayerPresenter from "../Player/PlayerPresenter.js";
import BallModel from "../Ball/BallModel.js";
import BallView from "../Ball/BallView.js";
import BallPresenter from "../Ball/BallPresenter.js";
import UIManager from "./UIManager.js";
import * as C from "../ConstData/Constants.js";
import { PlayerStates } from "../ConstData/PlayerStates.js";
import Goal from "../Goal/Goal.js";

// =====================================================================================
// Match クラス (改良版)
// Match クラス (改良版)
// 責務：試合全体の進行管理（リソース生成・状態遷移・入力伝搬・衝突判定・UI同期）
// =====================================================================================
export default class Match {
  players = [];
  ballPresenter;
  ui;
  scene;
  goalAlpha;
  goalBravo;

  score = { alpha: 0, bravo: 0 };
  time = C.GAME_DURATION;
  state = "start";
  kickCharge = { charging: false, elapsed: 0 };
  postGoalTimer = 0;

  players = [];
  ballPresenter;
  ui;
  scene;
  goalAlpha;
  goalBravo;

  score = { alpha: 0, bravo: 0 };
  time = C.GAME_DURATION;
  state = "start";
  kickCharge = { charging: false, elapsed: 0 };
  postGoalTimer = 0;

  constructor(scene) {
    this.scene = scene;
    this.ui = new UIManager();

    this.createField();

    this.players.push(this.createPlayer("user_alpha_1", "alpha", true));
    this.players.push(this.createPlayer("ai_alpha_2", "alpha", false));
    this.players.push(this.createPlayer("ai_alpha_3", "alpha", false));
    this.players.push(this.createPlayer("ai_bravo_1", "bravo", false));
    this.players.push(this.createPlayer("ai_bravo_2", "bravo", false));
    this.players.push(this.createPlayer("ai_bravo_3", "bravo", false));

    const ballModel = new BallModel();
    const ballView = new BallView(this.scene);
    this.ballPresenter = new BallPresenter(ballModel, ballView);

    this.goalAlpha = new Goal("alpha");
    this.goalBravo = new Goal("bravo");

    const resetButton = this.ui.getResetButton?.();
    resetButton?.addEventListener("click", () => this.start());

    this.start();
  }

  createPlayer(id, team, isUser) {
    const model = new PlayerModel(id, team, isUser);
    const view = new PlayerView(this.scene, team);
    return new PlayerPresenter(model, view);
  }

  createField() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(C.FIELD_WIDTH, C.FIELD_HEIGHT),
      new THREE.MeshStandardMaterial({ color: 0x008800 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const alphaGoalMesh = this.createGoalMesh('alpha');
    alphaGoalMesh.position.set(0, 0, -C.FIELD_HEIGHT / 2);
    this.scene.add(alphaGoalMesh);

    const bravoGoalMesh = this.createGoalMesh('bravo');
    bravoGoalMesh.position.set(0, 0, C.FIELD_HEIGHT / 2);
    bravoGoalMesh.rotation.y = Math.PI;
    this.scene.add(bravoGoalMesh);
  }

  /**
   * ゴールモデル（フレームとネット）を生成して返す。
   */
  createGoalMesh(team) {
    const goalGroup = new THREE.Group();

    const goalColor = team === 'alpha' ? 0xff4141 : 0x4195ff;
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: goalColor,
        metalness: 0.2,
        roughness: 0.5,
    });

    const postGeometry = new THREE.BoxGeometry(
      C.GOAL_POST_THICKNESS,
      C.GOAL_HEIGHT,
      C.GOAL_POST_THICKNESS
    );
    const crossbarGeometry = new THREE.BoxGeometry(
      C.GOAL_WIDTH,
      C.GOAL_POST_THICKNESS,
      C.GOAL_POST_THICKNESS
    );
    const netGeometry = new THREE.BoxGeometry(
      C.GOAL_WIDTH,
      C.GOAL_HEIGHT,
      C.GOAL_POST_THICKNESS / 2
    );

    const halfWidth = C.GOAL_WIDTH / 2;
    const postOffset = halfWidth - C.GOAL_POST_THICKNESS / 2;

    const leftPost = new THREE.Mesh(postGeometry, frameMaterial);
    leftPost.castShadow = true;
    leftPost.position.set(-postOffset, C.GOAL_HEIGHT / 2, 0);
    goalGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeometry, frameMaterial);
    rightPost.castShadow = true;
    rightPost.position.set(postOffset, C.GOAL_HEIGHT / 2, 0);
    goalGroup.add(rightPost);

    const crossbar = new THREE.Mesh(crossbarGeometry, frameMaterial);
    crossbar.castShadow = true;
    crossbar.position.set(0, C.GOAL_HEIGHT - C.GOAL_POST_THICKNESS / 2, 0);
    goalGroup.add(crossbar);

    const bottomBar = new THREE.Mesh(crossbarGeometry, frameMaterial);
    bottomBar.castShadow = true;
    bottomBar.position.set(
      0,
      C.GOAL_POST_THICKNESS / 2,
      -C.GOAL_DEPTH + C.GOAL_POST_THICKNESS / 2
    );
    goalGroup.add(bottomBar);

    const netMaterial = new THREE.MeshStandardMaterial({
      color: goalColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      metalness: 0,
      roughness: 1,
    });
    const net = new THREE.Mesh(netGeometry, netMaterial);
    net.receiveShadow = true;
    net.position.set(
      0,
      C.GOAL_HEIGHT / 2,
      -C.GOAL_DEPTH + netGeometry.parameters.depth / 2
    );
    
    goalGroup.add(net);

    return goalGroup;
  }

  start({ resetScore = true, resetTime = true } = {}) {
    if (resetScore) {
      this.score = { alpha: 0, bravo: 0 };
    }
    if (resetTime) {
      this.time = C.GAME_DURATION;
    }

    this.state = "playing";
    this.postGoalTimer = 0;

    this.cancelKickCharge();
    this.kickCharge.charging = false;
    this.kickCharge.elapsed = 0;

    let alphaIndex = 0;
    let bravoIndex = 0;

    this.players.forEach((player) => {
      const model = player.model;

      model.setVelocity(new THREE.Vector3());
      model.setStunTimer(0);
      model.setCatchCooldown(0);
      model.setHasBall(false);
      model.setQuaternion(new THREE.Quaternion());
      model.setCharging(false);
      model.setState(PlayerStates.Idle);

      if (model.isUser()) {
        model.setPosition(0, C.PLAYER_Y, -15);
        model.setHasBall(true);
      } else if (model.getTeam() === "alpha") {
        const x = alphaIndex % 2 === 0 ? -20 : 20;
        const z = -5 - Math.floor(alphaIndex / 2) * 5;
        model.setPosition(x, C.PLAYER_Y, z);
        alphaIndex += 1;
      } else {
        const x = bravoIndex % 2 === 0 ? -20 : 20;
        const z = 5 + Math.floor(bravoIndex / 2) * 5;
        model.setPosition(x, C.PLAYER_Y, z);
        bravoIndex += 1;
      }

      player.view.update(model);
    });

    const userPlayer = this.getUserPlayer();
    if (userPlayer) {
      this.ballPresenter.model.setOwner(userPlayer.model.getId());
      this.ballPresenter.model.setVelocity(new THREE.Vector3());
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
        userPlayer.model.getQuaternion()
      );
      const ballPos = userPlayer.model
        .getPosition()
        .clone()
        .add(forward.multiplyScalar(C.PLAYER_RADIUS + C.BALL_RADIUS));
      ballPos.y = C.BALL_RADIUS;
      this.ballPresenter.model.setPosition(ballPos.x, ballPos.y, ballPos.z);
    } else {
      this.ballPresenter.model.setOwner(null);
      this.ballPresenter.model.setVelocity(new THREE.Vector3());
      this.ballPresenter.model.setPosition(0, C.BALL_RADIUS, 0);
    }
    this.ballPresenter.view.update(this.ballPresenter.model);

    this.ui.updateScoreboard?.(this.score);
    this.ui.updateTimer?.(this.time);
    this.ui.updateDebugMonitor?.(
      this.getUserPlayer()?.model ?? null,
      this.ballPresenter.model
    );
  }

  update(deltaTime, input = {}) {
    if (this.state === "goal") {
      this.postGoalTimer = Math.max(0, this.postGoalTimer - deltaTime);

      this.ui.updateScoreboard?.(this.score);
      this.ui.updateTimer?.(this.time);
      this.ui.updateDebugMonitor?.(
        this.getUserPlayer()?.model ?? null,
        this.ballPresenter.model
      );

      if (this.postGoalTimer === 0) {
        this.start({ resetScore: false, resetTime: false });
      }
      return;
    }

    if (this.state !== "playing") return;

    this.time = Math.max(0, this.time - deltaTime);
    if (this.time === 0) {
      this.handleTimeUp();
    }

    this.players.forEach((player) => {
      const playerInput = player.model.isUser() ? input : {};
      player.update(deltaTime, playerInput);
    });

    this.updateKickCharge(deltaTime);

    this.ballPresenter.update(deltaTime);
    this.attachBallToOwner();
    this.checkCollisions();

    this.ui.updateScoreboard?.(this.score);
    this.ui.updateTimer?.(this.time);
    this.ui.updateDebugMonitor?.(
      this.getUserPlayer()?.model ?? null,
      this.ballPresenter.model
    );
  }

  beginKickCharge() {
    if (this.state !== "playing") return;

    const userPlayer = this.getUserPlayer();
    if (!userPlayer?.model.hasBall()) return;
    if (this.kickCharge.charging) return;

    this.kickCharge.charging = true;
    this.kickCharge.elapsed = 0;
    userPlayer.model.setCharging(true);
    userPlayer.model.setState(PlayerStates.Charge);
    userPlayer.model.setVelocity(new THREE.Vector3());
    this.ui.showPowerGauge?.();
    this.ui.updatePowerGauge?.(0);
  }

  endKickCharge() {
    if (!this.kickCharge.charging) return;

    const userPlayer = this.getUserPlayer();
    if (!userPlayer?.model.hasBall()) {
      this.cancelKickCharge();
      return;
    }
    userPlayer.model.setKickChargeRatio?.(0);

    const chargeRatio = this.kickCharge.elapsed / C.MAX_KICK_CHARGE_TIME;
    const power = THREE.MathUtils.lerp(
      C.MIN_KICK_FORCE,
      C.MAX_KICK_FORCE,
      chargeRatio
    );

    userPlayer.model.setState(PlayerStates.Kick);
    userPlayer.releaseBall();
    this.ballPresenter.model.setOwner(null);

    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
      userPlayer.model.getQuaternion()
    );
    this.ballPresenter.applyKick(direction, power);

    this.cancelKickCharge();
  }

  cancelKickCharge() {
    const wasCharging = this.kickCharge.charging;

    this.kickCharge.charging = false;
    this.kickCharge.elapsed = 0;

    const userPlayer = this.getUserPlayer();
    if (userPlayer) {
      userPlayer.model.setCharging(false);
      if (wasCharging && userPlayer.model.getState() === PlayerStates.Charge) {
        userPlayer.model.setState(PlayerStates.Idle);
      }
    }
    this.ui.hidePowerGauge?.();
  }

  updateKickCharge(deltaTime) {
    if (!this.kickCharge.charging) return;

    const userPlayer = this.getUserPlayer();
    if (!userPlayer?.model.hasBall()) {
        this.cancelKickCharge();
        return;
    }

    this.kickCharge.elapsed = Math.min(
        this.kickCharge.elapsed + deltaTime,
        C.MAX_KICK_CHARGE_TIME
    );
    const ratio = this.kickCharge.elapsed / C.MAX_KICK_CHARGE_TIME;
    userPlayer.model.setKickChargeRatio?.(ratio);
    this.ui.updatePowerGauge?.(ratio);
  }

  attachBallToOwner() {
    const ballModel = this.ballPresenter.model;
    const ownerId = ballModel.getOwner();
    if (!ownerId) return;

    const owner = this.players.find((p) => p.model.getId() === ownerId);
    if (!owner) {
      ballModel.setOwner(null);
      return;
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      owner.model.getQuaternion()
    );
    const attachPos = owner.model
      .getPosition()
      .clone()
      .add(forward.multiplyScalar(C.PLAYER_RADIUS + C.BALL_RADIUS));
    attachPos.y = C.BALL_RADIUS;

    ballModel.setPosition(attachPos.x, attachPos.y, attachPos.z);
    ballModel.setVelocity(new THREE.Vector3());
  }

  checkCollisions() {
    const ballModel = this.ballPresenter.model;
    const ballPos = ballModel.getPosition();
    const ownerId = ballModel.getOwner();

    const scoringTeam = this.getGoalScoringTeam(ballPos);
    if (scoringTeam) {
      this.handleGoal(scoringTeam, ownerId);
      return;
    }

    if (!ownerId) {
      const catchRadiusSq = (C.PLAYER_RADIUS + C.BALL_RADIUS) ** 2;
      for (const player of this.players) {
        const model = player.model;
        if (model.getStunTimer() > 0) continue;
        if (model.getCatchCooldown() > 0) continue;

        const playerPos = model.getPosition();
        const horizontalDistSq =
          (playerPos.x - ballPos.x) ** 2 + (playerPos.z - ballPos.z) ** 2;
        const heightDiff = Math.abs(playerPos.y - ballPos.y);

        if (
          horizontalDistSq <= catchRadiusSq &&
          heightDiff <= C.CATCH_HEIGHT_TOLERANCE
        ) {
          model.setHasBall(true);
          model.setCatchCooldown(0);
          ballModel.setOwner(model.getId());
          ballModel.setVelocity(new THREE.Vector3());
          this.attachBallToOwner();
          player.view.update(model);
          this.ui.updateDebugMonitor?.(model, ballModel);
          return;
        }
      }

      return;
    }

    const holder = this.players.find((p) => p.model.getId() === ownerId);
    if (!holder) {
      ballModel.setOwner(null);
      return;
    }

    const holderPos = holder.model.getPosition();
    const diff = new THREE.Vector3();
    const collisionRadiusSq = (C.PLAYER_RADIUS * 2) ** 2;

    for (const player of this.players) {
      if (player === holder) continue;
      if (player.model.getStunTimer() > 0) continue;
      if (player.model.getCatchCooldown() > 0) continue;

      diff.copy(player.model.getPosition()).sub(holderPos);

      if (diff.lengthSq() <= collisionRadiusSq) {
        this.transferBall(holder, player);
        break;
      }
    }
  }

  transferBall(loser, winner) {
    if (!loser.model.hasBall()) return;

    loser.model.setHasBall(false);
    loser.model.setCatchCooldown(C.CATCH_COOLDOWN);
    loser.model.setStunTimer(C.STUN_DURATION);
    loser.model.setCharging(false);
    if (loser.model.getState() === PlayerStates.Charge) {
      loser.model.setState(PlayerStates.Idle);
    }

    winner.model.setHasBall(true);
    winner.model.setCatchCooldown(0);
    winner.model.setStunTimer(0);

    this.ballPresenter.model.setOwner(winner.model.getId());
    this.ballPresenter.model.setVelocity(new THREE.Vector3());
    this.attachBallToOwner();

    loser.view.update(loser.model);
    winner.view.update(winner.model);

    if (loser.model.isUser()) {
      this.cancelKickCharge();
    }

    this.ui.updateDebugMonitor?.(winner.model, this.ballPresenter.model);
  }

  handleGoal(scoringTeam, scorerId) {
    if (this.state !== "playing") return;

    this.state = "goal";
    this.postGoalTimer = C.POST_GOAL_DELAY;
    this.cancelKickCharge();

    if (!this.score[scoringTeam]) {
      this.score[scoringTeam] = 0;
    }
    this.score[scoringTeam] += 1;

    const scorerPresenter = scorerId
      ? this.players.find((p) => p.model.getId() === scorerId)
      : null;

    this.players.forEach((player) => {
      player.model.setVelocity(new THREE.Vector3());
      player.model.setHasBall(false);
      player.model.setCharging(false);
      const currentState = player.model.getState();
      if (
        currentState === PlayerStates.Charge ||
        currentState === PlayerStates.Kick
      ) {
        player.model.setState(PlayerStates.Idle);
      }
      player.view.update(player.model);
    });

    this.ballPresenter.model.setOwner(null);
    this.ballPresenter.model.setVelocity(new THREE.Vector3());
    this.ballPresenter.view.update(this.ballPresenter.model);

    this.ui.updateScoreboard?.(this.score);
    this.ui.updateDebugMonitor?.(
      this.getUserPlayer()?.model ?? null,
      this.ballPresenter.model
    );
  }

  handleTimeUp() {
    if (this.state !== "playing") return;
    this.state = "result";
    this.cancelKickCharge();
  }

  getUserPlayer() {
    return this.players.find((p) => p.model.isUser());
  }

  getGoalScoringTeam(ballPosition) {
    if (this.goalAlpha.isBallInside(ballPosition, C.BALL_RADIUS)) {
      return this.goalAlpha.getScoringTeam();
    }
    if (this.goalBravo.isBallInside(ballPosition, C.BALL_RADIUS)) {
      return this.goalBravo.getScoringTeam();
    }
    return null;
  }
}