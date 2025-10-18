import * as THREE from 'three';
import * as C from '../ConstData/Constants.js';

// =================================================================================
// Goal ドメインオブジェクト (Goal.js)
// 責務：ゴールの範囲と所属チームを管理し、ボールが入ったかを判定する。
// =================================================================================
export default class Goal {
    #team;
    #boundingBox;

    /**
     * @param {string} team このゴールが所属するチーム ('alpha' or 'bravo')
     */
    constructor(team) {
        this.#team = team;

        if (team === 'alpha') {
            // アルファチームのゴール（フィールドの-Z側）
            this.#boundingBox = new THREE.Box3(
                new THREE.Vector3(-C.GOAL_WIDTH / 2, 0, -C.FIELD_HEIGHT / 2 - C.GOAL_DEPTH),
                new THREE.Vector3(C.GOAL_WIDTH / 2, C.GOAL_HEIGHT, -C.FIELD_HEIGHT / 2)
            );
        } else {
            // ブラボーチームのゴール（フィールドの+Z側）
            this.#boundingBox = new THREE.Box3(
                new THREE.Vector3(-C.GOAL_WIDTH / 2, 0, C.FIELD_HEIGHT / 2),
                new THREE.Vector3(C.GOAL_WIDTH / 2, C.GOAL_HEIGHT, C.FIELD_HEIGHT / 2 + C.GOAL_DEPTH)
            );
        }
    }

    /**
     * このゴールにボールが入ったかどうかを判定する
     * @param {THREE.Vector3} ballPosition ボールの現在位置
     * @returns {boolean} ゴール内であればtrue
     */
    isBallInside(ballPosition, radius = 0) {
        if (radius <= 0) {
            return this.#boundingBox.containsPoint(ballPosition);
        }
        const expandedBox = this.#boundingBox.clone().expandByScalar(radius);
        return expandedBox.containsPoint(ballPosition);
    }

    /**
     * このゴールに入れられると得点するチームを返す
     * @returns {string} 'alpha' or 'bravo'
     */
    getScoringTeam() {
        // アルファのゴールに入ればブラボーの得点
        return this.#team === 'alpha' ? 'bravo' : 'alpha';
    }
}