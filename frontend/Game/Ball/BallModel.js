import * as THREE from 'three';

// =================================================================================
// Model (BallModel)
// 責務：ボールの状態（データ）を保持することに専念します。
// =================================================================================
export default class BallModel {
    #position;
    #velocity;
    #ownerId; // ボールを所有しているプレイヤーのID
    #lastKickerId;

    constructor() {
        this.#position = new THREE.Vector3(0, 0.75, 0); // BALL_RADIUS
        this.#velocity = new THREE.Vector3();
        this.#ownerId = null;
        this.#lastKickerId = null;
    }

    // --- Getters ---
    getPosition() { return this.#position.clone(); }
    getVelocity() { return this.#velocity.clone(); }
    getOwner() { return this.#ownerId; }
    getLastKicker() { return this.#lastKickerId; }

    // --- Setters ---
    setPosition(x, y, z) { this.#position.set(x, y, z); }
    setVelocity(velocity) { this.#velocity.copy(velocity); }
    setOwner(playerId) { this.#ownerId = playerId; }
    setLastKicker(playerId) { this.#lastKickerId = playerId; }
}