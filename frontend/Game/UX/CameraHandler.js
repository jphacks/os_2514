import * as THREE from 'three';
import * as C from '../ConstData/Constants.js';

export default class CameraHandler {
    #camera;
    #shake = { time: 0, intensity: 0 };
    #replayClock = new THREE.Clock();

    constructor(camera) {
        this.#camera = camera;
    }

    update(delta, playerModel, matchState, ballModel) {
        if (matchState === 'replay') {
            this.#updateReplayCamera(ballModel);
        } else {
            if (playerModel) {
                this.#updateFollowCamera(playerModel);
            }
        }

        if (this.#shake.time > 0) {
            this.#shake.time -= delta;
            this.#camera.position.x += (Math.random() - 0.5) * this.#shake.intensity;
            this.#camera.position.y += (Math.random() - 0.5) * this.#shake.intensity;
        }
    }

    #updateFollowCamera(playerModel) {
        const offset = new THREE.Vector3(0, 10, -15);
        offset.applyQuaternion(playerModel.getQuaternion());
        const targetPosition = playerModel.getPosition().clone().add(offset);
        this.#camera.position.lerp(targetPosition, 0.08);
        
        const lookAtPos = playerModel.getPosition().clone();
        lookAtPos.y += 2;
        this.#camera.lookAt(lookAtPos);
    }

    #updateReplayCamera(ballModel) {
        // This is a simplified version. A full replay would use stored data.
        const goalPosition = ballModel.getPosition().z > 0 ? 
            new THREE.Vector3(0, 5, C.FIELD_HEIGHT / 2 + 10) : 
            new THREE.Vector3(0, 5, -C.FIELD_HEIGHT / 2 - 10);
        
        this.#camera.position.lerp(goalPosition, 0.05);
        this.#camera.lookAt(ballModel.getPosition());
    }

    triggerShake(intensity, duration) {
        this.#shake.intensity = intensity;
        this.#shake.time = duration;
    }

    getCamera() {
        return this.#camera;
    }
}