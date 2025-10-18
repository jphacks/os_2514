/**
 * 画面上のジョイスティックUIと操作を管理するクラス。
 */
export default class Joystick {
    state;
    #baseElement;
    #thumbElement;
    #radius;
    #centerX;
    #centerY;

    /**
     * @param {string} baseElementId ジョイスティックの土台となる要素のID
     * @param {string} thumbElementId ジョイスティックの操作部分となる要素のID
     */
    constructor(baseElementId, thumbElementId) {
        this.state = {
            active: false,
            angle: 0,
            strength: 0,
        };
        this.#baseElement = document.getElementById(baseElementId);
        this.#thumbElement = document.getElementById(thumbElementId);

        this.#onResize(); // 初期サイズを設定
        this.#addEventListeners();
    }

    #addEventListeners() {
        this.#baseElement.addEventListener('mousedown', this.#handleStart.bind(this));
        window.addEventListener('mousemove', this.#handleMove.bind(this));
        window.addEventListener('mouseup', this.#handleEnd.bind(this));
        this.#baseElement.addEventListener('touchstart', this.#handleStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.#handleMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.#handleEnd.bind(this));
        window.addEventListener('resize', this.#onResize.bind(this));
    }
    
    #onResize() {
        const rect = this.#baseElement.getBoundingClientRect();
        this.#radius = rect.width / 2;
        this.#centerX = rect.left + this.#radius;
        this.#centerY = rect.top + this.#radius;
    }

    #handleStart(e) {
        e.preventDefault();
        this.state.active = true;
        this.#handleMove(e);
    }

    #handleMove(e) {
        if (!this.state.active) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        let dx = clientX - this.#centerX;
        let dy = clientY - this.#centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        this.state.angle = Math.atan2(dx, -dy);
        
        const maxDist = this.#radius - this.#thumbElement.clientWidth / 2;
        this.state.strength = Math.min(distance, maxDist) / maxDist;
        
        if (distance > maxDist) {
            dx = Math.sin(this.state.angle) * maxDist;
            dy = -Math.cos(this.state.angle) * maxDist;
        }
        
        this.#thumbElement.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    }

    #handleEnd(e) {
        if (!this.state.active) return;
        e.preventDefault();
        this.state.active = false;
        this.state.strength = 0;
        this.#thumbElement.style.transform = `translate(-50%, -50%)`;
    }

    getState() {
        return this.state;
    }
}
