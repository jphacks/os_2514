import * as THREE from 'three';
import * as C from '../ConstData/Constants.js';
import { PlayerStates } from '../ConstData/PlayerStates.js';

// =================================================================================
// 3. Presenter (PlayerPresenter)
//    Model と View を仲介し、入力処理やステート更新を担当する。
// =================================================================================
export default class PlayerPresenter {
    #model;
    #view;
    #joystickReferenceAngle = null;
    #joystickReferenceQuaternion = new THREE.Quaternion();

    /**
     * @param {PlayerModel} model ロジック状態を扱うモデル
     * @param {PlayerView}  view  描画担当のビュー
     */
    constructor(model, view) {
        this.#model = model;
        this.#view = view;
    }

    /**
     * 毎フレーム呼び出され、スタン/移動/アニメーション状態を更新する。
     * @param {number} deltaTime 経過秒数
     * @param {object} input     入力情報（ユーザーキャラのみ有効）
     */
    update(deltaTime, input) {
        this.#updateStunState(deltaTime);
        this.#updateCooldowns(deltaTime);

        if (this.#model.isUser()) {
            this.handleInput(input);
        }

        this.#integratePosition(deltaTime);
        this.#updateStateByVelocity();

        this.#view.update(this.#model);
    }

    /**
     * ユーザー入力を受け取り、向きと速度を更新する。
     * @param {{ joystick?: object, keys?: Record<string, boolean> }} input
     */
    handleInput(input) {
        const joystick = input?.joystick;
        const keys = input?.keys;
        const velocity = new THREE.Vector3();

        if (joystick?.active) {
            if (this.#joystickReferenceAngle === null) {
                this.#joystickReferenceAngle = joystick.angle;
                this.#joystickReferenceQuaternion.copy(this.#model.getQuaternion());
            }

            const deltaAngle =
                THREE.MathUtils.euclideanModulo(
                    -joystick.angle - this.#joystickReferenceAngle + Math.PI,
                    Math.PI * 2
                ) - Math.PI;

            const responsiveDelta = deltaAngle * C.JOYSTICK_SENSITIVITY;
            const rotationDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), responsiveDelta);

            const nextQuat = this.#joystickReferenceQuaternion
                .clone()
                .multiply(rotationDelta)
                .normalize();

            this.#model.setQuaternion(nextQuat);
        } else {
            this.#joystickReferenceAngle = null;
        }
        if (keys?.KeyW) {
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.#model.getQuaternion());
            velocity.add(forward.multiplyScalar(C.PLAYER_SPEED));
        }

        this.#model.setVelocity(velocity);
    }

    /**
     * UI にスコアを反映する（必要時に Match 側から参照される）。
     */
    updateScoreboard(score) {
        if (!this.scoreAlphaEl || !this.scoreBravoEl) return;
        this.scoreAlphaEl.textContent = score.alpha;
        this.scoreBravoEl.textContent = score.bravo;
    }

    /**
     * UI に残り時間を反映する。
     */
    updateTimer(time) {
        if (!this.timerEl) return;
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * デバッグモニタへステートやボール保持者を表示する。
     */
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
     * Match から指示された際にボールを放す。
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

    // -------------------------------------------------------------------------
    // private helpers
    // -------------------------------------------------------------------------

    #updateStunState(deltaTime) {
        const stunTimer = this.#model.getStunTimer();
        if (stunTimer <= 0) {
            this.#view.setStunVisual(false);
            return;
        }

        const nextTimer = Math.max(0, stunTimer - deltaTime);
        this.#model.setStunTimer(nextTimer);
        this.#view.setStunVisual(true);

        if (nextTimer === 0) {
            this.#view.setStunVisual(false);
            console.log(
                `[State Change] ${this.#model.getId()} がスタン状態から復帰しました。`
            );
        }
    }

    #updateCooldowns(deltaTime) {
        if (this.#model.getCatchCooldown() > 0) {
            this.#model.setCatchCooldown(this.#model.getCatchCooldown() - deltaTime);
        }
    }

    #integratePosition(deltaTime) {
        const currentPos = this.#model.getPosition();
        const velocity = this.#model.getVelocity();
        const displacement = velocity.clone().multiplyScalar(deltaTime);
        const newPos = currentPos.add(displacement);

        this.#model.setPosition(newPos.x, newPos.y, newPos.z);
    }

    #updateStateByVelocity() {
        const velocity = this.#model.getVelocity();
        const speedSq = velocity.lengthSq();
        const currentState = this.#model.getState();

        if (currentState === PlayerStates.Charge && !this.#model.getIsCharging()) {
            this.#model.setState(speedSq > 0 ? PlayerStates.Run : PlayerStates.Idle);
            return;
        }

        if (currentState === PlayerStates.Kick && !this.#model.hasBall()) {
            this.#model.setState(speedSq > 0 ? PlayerStates.Run : PlayerStates.Idle);
            return;
        }

        if (currentState !== PlayerStates.Charge && currentState !== PlayerStates.Kick) {
            this.#model.setState(speedSq > 0 ? PlayerStates.Run : PlayerStates.Idle);
        }
    }
}