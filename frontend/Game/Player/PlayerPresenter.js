import * as THREE from 'three';
import * as C from '../ConstData/Constants.js';
import { PlayerStates } from '../ConstData/PlayerStates.js';

// =================================================================================
// 3. Presenter (PlayerPresenter)
// =================================================================================
export default class PlayerPresenter {
    #model;
    #view;

    constructor(model, view) {
        this.#model = model;
        this.#view = view;
    }

    update(deltaTime, input) {
        const stunTimer = this.#model.getStunTimer();

        if (stunTimer > 0) {
            const nextTimer = Math.max(0, stunTimer - deltaTime);
            this.#model.setStunTimer(nextTimer);
            this.#view.setStunVisual(true);

            if (nextTimer === 0) {
                this.#view.setStunVisual(false);
                console.log(
                    `[State Change] ${this.#model.getId()} がスタン状態から復帰しました。`
                );
            }
        } else {
            this.#view.setStunVisual(false);
        }

        if (this.#model.getCatchCooldown() > 0) {
            this.#model.setCatchCooldown(this.#model.getCatchCooldown() - deltaTime);
        }

        if (this.#model.isUser()) {
            this.handleInput(input);
        }

        const currentPos = this.#model.getPosition();
        const velocity = this.#model.getVelocity();
        const displacement = velocity.clone().multiplyScalar(deltaTime);
        const newPos = currentPos.add(displacement);

        this.#model.setPosition(newPos.x, newPos.y, newPos.z);

        const speedSq = velocity.lengthSq();
        const currentState = this.#model.getState();
        if (currentState === PlayerStates.Charge) {
            if (!this.#model.getIsCharging()) {
                this.#model.setState(speedSq > 0 ? PlayerStates.Run : PlayerStates.Idle);
            }
        } else if (currentState === PlayerStates.Kick) {
            if (!this.#model.hasBall()) {
                this.#model.setState(speedSq > 0 ? PlayerStates.Run : PlayerStates.Idle);
            }
        } else {
            this.#model.setState(speedSq > 0 ? PlayerStates.Run : PlayerStates.Idle);
        }

        this.#view.update(this.#model);
    }

    handleInput(input) {
        const joystick = input.joystick;
        const keys = input.keys;

        if (joystick?.active) {
            const targetQuat = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                joystick.angle
            );
            this.#model.setQuaternion(targetQuat);
        }

        const velocity = new THREE.Vector3();

        if (keys?.KeyW) {
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.#model.getQuaternion());
            velocity.add(forward.multiplyScalar(C.PLAYER_SPEED));
        }

        this.#model.setVelocity(velocity);
    }

    updateScoreboard(score) {
        if (!this.scoreAlphaEl || !this.scoreBravoEl) return;
        this.scoreAlphaEl.textContent = score.alpha;
        this.scoreBravoEl.textContent = score.bravo;
    }

    updateTimer(time) {
        if (!this.timerEl) return;
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDebugMonitor(playerModel, ballModel) {
        if (!playerModel || !this.debugMonitor) return;
        const toFixed = (v) => v.toFixed(1);

        if (this.debugPlayerState) {
            this.debugPlayerState.textContent = playerModel.getState();
        }
        if (this.debugPlayerPos) {
            const pos = playerModel.getPosition();
            this.debugPlayerPos.textContent = `x:${toFixed(pos.x)} z:${toFixed(pos.z)}`;
        }
        if (this.debugBallOwner) {
            const ownerId = ballModel?.getOwner();
            this.debugBallOwner.textContent = ownerId ? ownerId : 'None';
        }
    }

    /**
     * Matchクラスからの指示でボールを手放す
     */
    releaseBall() {
        this.#model.setHasBall(false);
        this.#model.setCatchCooldown(0);
        this.#view.update(this.#model);
    }
    
    get model() {
        return this.#model;
    }

    get view() {
        return this.#view;
    }
    // 他のメソッドは変更なし
}