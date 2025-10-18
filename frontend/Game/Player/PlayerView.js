import * as THREE from 'three';
import * as C from '../ConstData/Constants.js';

// =================================================================================
// 2. View (PlayerView)
// =================================================================================
export default class PlayerView {
    playerMesh;
    indicator;
    #scene;

    constructor(scene, team) {
        this.#scene = scene;
        this.init(team);
    }

    init(team) {
        const color = team === 'alpha' ? 0xff4141 : 0x4195ff;
        const geometry = new THREE.CapsuleGeometry(C.PLAYER_RADIUS, 3, 4, 16);
        const material = new THREE.MeshStandardMaterial({ color: color });
        this.playerMesh = new THREE.Mesh(geometry, material);
        this.playerMesh.castShadow = true;
        this.#scene.add(this.playerMesh);

        const indicatorGeom = new THREE.RingGeometry(C.PLAYER_RADIUS * 1.1, C.PLAYER_RADIUS * 1.2, 32);
        const indicatorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        this.indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
        this.indicator.rotation.x = -Math.PI / 2;
        this.indicator.position.y = 0.1;
        this.#scene.add(this.indicator);
    }

    update(model) {
        this.playerMesh.position.copy(model.getPosition());
        this.playerMesh.quaternion.copy(model.getQuaternion());

        this.indicator.position.set(model.getPosition().x, 0.1, model.getPosition().z);
        
        this.indicator.material.color.set(model.hasBall() ? (model.getTeam() === 'alpha' ? 0xff4141 : 0x4195ff) : 0xffffff);
    }

    setStunVisual(isStunned) {
        if(isStunned) {
           this.playerMesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
           this.playerMesh.visible = true;
        }
    }
    // 他のメソッドは変更なし
}