import * as THREE from "three";
import * as C from "../ConstData/Constants.js";
import { PlayerStates } from "../ConstData/PlayerStates.js";

// =================================================================================
// 1. Model (PlayerModel)
// =================================================================================

/**
 * プレイヤーのロジック状態（位置・向き・ステータス等）を保持するモデル。
 * 表示や操作に依存せずデータのみを提供する。
 */
export default class PlayerModel {
  /** プレイヤー識別情報・現在値をカプセル化したプライベートフィールド群 */
  #id;
  #team;
  #isUser;
  #position;
  #quaternion;
  #state;
  #hasBall;
  #velocity;
  #stunTimer;
  #catchCooldown;
  #isCharging;

  /**
   * プレイヤーの初期状態を構築する。
   * @param {string} id    プレイヤー識別子
   * @param {string} team  所属チーム名
   * @param {boolean} [isUser=false] ユーザー操作キャラクターかどうか
   */
  constructor(id, team, isUser = false) {
    this.#id = id;
    this.#team = team;
    this.#isUser = isUser;
    this.#position = new THREE.Vector3(0, C.PLAYER_Y, 0);
    this.#quaternion = new THREE.Quaternion();
    this.#state = PlayerStates.Idle;
    this.#hasBall = false;
    this.#velocity = new THREE.Vector3();
    this.#stunTimer = C.STUN_DURATION;
    this.#catchCooldown = 0;
    this.#isCharging = false;
  }

  /** 現在の各種状態を参照するためのアクセサ */
  // --- Getters ---
  getId() {
    return this.#id;
  }
  getTeam() {
    return this.#team;
  }
  isUser() {
    return this.#isUser;
  }
  getPosition() {
    return this.#position.clone();
  }
  getQuaternion() {
    return this.#quaternion.clone();
  }
  getState() {
    return this.#state;
  }
  hasBall() {
    return this.#hasBall;
  }
  getVelocity() {
    return this.#velocity.clone();
  }
  getStunTimer() {
    return this.#stunTimer;
  }
  getCatchCooldown() {
    return this.#catchCooldown;
  }
  getIsCharging() {
    return this.#isCharging;
  }

  /** ロジックから状態を更新するためのミューテータ */
  // --- Setters ---
  setPosition(x, y, z) {
    this.#position.set(x, y, z);
  }
  setQuaternion(quaternion) {
    this.#quaternion.copy(quaternion);
  }

  /**
   * ステートを変更する。PlayerStates に存在しない値は無視する。
   * @param {string} state PlayerStates のいずれか
   */
  setState(state) {
    if (!PlayerStates.values().includes(state)) {
      console.warn(`[PlayerModel] Unknown state: ${state}`);
      return;
    }
    this.#state = state;
  }

  /**
   * ボール保持フラグを更新する。変化時はデバッグログを出力する。
   * @param {boolean} hasBall 保持状態
   */
  setHasBall(hasBall) {
    if (this.#hasBall !== hasBall) {
      console.log(`[State Change] ${this.#id} のボール所持状態: ${hasBall}`);
    }
    this.#hasBall = hasBall;
  }

  setVelocity(velocity) {
    this.#velocity.copy(velocity);
  }
  setStunTimer(duration) {
    this.#stunTimer = Math.max(0, duration);
  }
  setCatchCooldown(value) {
    this.#catchCooldown = Math.max(0, value);
  }

  /**
   * チャージ状態を切り替える。変化時はデバッグログを出力する。
   * @param {boolean} value チャージ中かどうか
   */
  setCharging(value) {
    const next = Boolean(value);
    if (this.#isCharging !== next) {
      console.log(`[State Change] ${this.#id} のチャージ状態: ${next}`);
    }
    this.#isCharging = next;
  }

  setKickChargeRatio(ratio) {
    this.kickChargeRatio = Math.max(0, Math.min(1, ratio));
  }
  getKickChargeRatio() {
    return this.kickChargeRatio ?? 0;
  }
}
