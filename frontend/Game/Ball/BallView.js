import * as THREE from 'three';

// =================================================================================
// View (BallView)
// 責務：ボールの3Dオブジェクトの描画に専念します。
// =================================================================================
export default class BallView {
    ballMesh;
    ballTrail = [];
    #scene;

    constructor(scene) {
        this.#scene = scene;
        this.init();
    }

    init() {
        // Ball Mesh
        this.ballMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.75, 16, 16), // BALL_RADIUS
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        this.ballMesh.castShadow = true;
        this.#scene.add(this.ballMesh);

        // Ball Trail
        for (let i = 0; i < 10; i++) {
            const trailPart = new THREE.Mesh(
                new THREE.SphereGeometry(0.75 * 0.8, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
            );
            this.ballTrail.push(trailPart);
            this.#scene.add(trailPart);
        }
    }

    /**
     * Modelのデータに基づいてボールの位置と軌跡を更新します。
     * @param {BallModel} model 
     */
    update(model) {
        this.ballMesh.position.copy(model.getPosition());
        
        // Update Trail
        let lastPos = this.ballMesh.position;
        const speed = model.getVelocity().length();
        this.ballTrail.forEach((part, i) => {
            const targetPos = lastPos;
            part.position.lerp(targetPos, 0.4);
            lastPos = part.position;
            part.material.opacity = (1 - (i / this.ballTrail.length)) * 0.5 * (speed / 80); // MAX_KICK_FORCE
        });
    }
}