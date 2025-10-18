import * as THREE from 'three';
import * as C from '../ConstData/Constants.js';

// =================================================================================
// Presenter (BallPresenter)
// =================================================================================
export default class BallPresenter {
    #model;
    #view;

    constructor(model, view) {
        this.#model = model;
        this.#view = view;
    }

    update(deltaTime) {
        if (!this.#model.getOwner()) {
            const velocity = this.#model.getVelocity();
            const position = this.#model.getPosition();

            velocity.y += C.GRAVITY * deltaTime;
            velocity.x *= 0.99;
            velocity.z *= 0.99;
            
            const newPos = position.add(velocity.clone().multiplyScalar(deltaTime));

            if (newPos.y < C.BALL_RADIUS) {
                newPos.y = C.BALL_RADIUS;
                velocity.y *= -0.6;
            }

            if (Math.abs(newPos.x) > C.FIELD_WIDTH / 2 - C.BALL_RADIUS) {
                velocity.x *= -0.8;
                newPos.x = Math.sign(newPos.x) * (C.FIELD_WIDTH / 2 - C.BALL_RADIUS);
            }
            if (Math.abs(newPos.z) > C.FIELD_HEIGHT / 2 - C.BALL_RADIUS) {
                velocity.z *= -0.8;
                newPos.z = Math.sign(newPos.z) * (C.FIELD_HEIGHT / 2 - C.BALL_RADIUS);
            }

            this.#model.setPosition(newPos.x, newPos.y, newPos.z);
            this.#model.setVelocity(velocity);
        }

        this.#view.update(this.#model);
    }

    /**
     * Matchクラスからの指示でキックを適用する
     * @param {THREE.Vector3} direction キック方向のベクトル
     * @param {number} power キックの強さ
     */
    applyKick(direction, power) {
        const newVelocity = direction.multiplyScalar(power);
        newVelocity.y = C.KICK_VERTICAL_FORCE; // 少しボールを浮かせる
        this.#model.setVelocity(newVelocity);
        this.#model.setOwner(null); // 所有者をなくす
    }

    get model() {
        return this.#model;
    }

    get view() {
        return this.#view;
    }
}