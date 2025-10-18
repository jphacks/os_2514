import * as THREE from 'three';
import * as C from '../ConstData/Constants.js';

// =================================================================================
// 1. Model (PlayerModel)
// =================================================================================
export default class PlayerModel {
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

    constructor(id, team, isUser = false) {
        this.#id = id;
        this.#team = team;
        this.#isUser = isUser;
        this.#position = new THREE.Vector3(0, C.PLAYER_Y, 0);
        this.#quaternion = new THREE.Quaternion();
        this.#state = 'idle';
        this.#hasBall = false;
        this.#velocity = new THREE.Vector3();
        this.#stunTimer = C.STUN_DURATION;
        this.#catchCooldown = 0;
        this.#isCharging = false;
    }

    // --- Getters ---
    getId() { return this.#id; }
    getTeam() { return this.#team; }
    isUser() { return this.#isUser; }
    getPosition() { return this.#position.clone(); }
    getQuaternion() { return this.#quaternion.clone(); }
    getState() { return this.#state; }
    hasBall() { return this.#hasBall; }
    getVelocity() { return this.#velocity.clone(); }
    getStunTimer() { return this.#stunTimer; }
    getCatchCooldown() { return this.#catchCooldown; }
    getIsCharging() { return this.#isCharging; }

    // --- Setters ---
    setPosition(x, y, z) { this.#position.set(x, y, z); }
    setQuaternion(quaternion) { this.#quaternion.copy(quaternion); }
    setState(state) { this.#state = state; }
    setHasBall(hasBall) { 
        if (this.#hasBall !== hasBall) {
            console.log(`[State Change] ${this.#id} のボール所持状態: ${hasBall}`);
        }
        this.#hasBall = hasBall;
    }
    setVelocity(velocity) { this.#velocity.copy(velocity); }
    setStunTimer(duration) {
        this.#stunTimer = Math.max(0, duration);
    }
    setCatchCooldown(value) { this.#catchCooldown = Math.max(0, value); }
    setCharging(value) {
        const next = Boolean(value);
        if (this.#isCharging !== next) {
            console.log(`[State Change] ${this.#id} のチャージ状態: ${next}`);
        }
        this.#isCharging = next;
    }
}