/**
 * 画面上のジョイスティック UI を制御し、角度・強度・アクティブ状態を管理する。
 */
export default class Joystick {
    /** 現在の入力状態 */
    state;
    /** DOM 要素参照 */
    #baseElement;
    #thumbElement;
    /** 計算キャッシュ */
    #radius;
    #centerX;
    #centerY;

    /**
     * @param {string} baseElementId  土台要素 ID
     * @param {string} thumbElementId スティック要素 ID
     */
    constructor(baseElementId, thumbElementId) {
        this.state = { active: false, angle: 0, strength: 0 };
        this.#baseElement = document.getElementById(baseElementId);
        this.#thumbElement = document.getElementById(thumbElementId);

        this.#onResize();      // 初期化時に幾何情報を取得
        this.#addListeners();  // マウス・タッチ入力を監視
    }

    /** 入力関連イベントをバインドする */
    #addListeners() {
        const start = this.#handleStart.bind(this);
        const move = this.#handleMove.bind(this);
        const end = this.#handleEnd.bind(this);

        this.#baseElement.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);

        this.#baseElement.addEventListener('touchstart', start, { passive: false });
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', end);

        window.addEventListener('resize', this.#onResize.bind(this));
    }

    /** 要素の位置と半径を再計測する */
    #onResize() {
        const rect = this.#baseElement.getBoundingClientRect();
        this.#radius = rect.width / 2;
        this.#centerX = rect.left + this.#radius;
        this.#centerY = rect.top + this.#radius;
    }

    /** 入力開始時にアクティブ化し、初期位置を計算する */
    #handleStart(event) {
        event.preventDefault();
        this.state.active = true;
        this.#handleMove(event);
    }

    /** 入力移動時に角度・強度・見た目を更新する */
    #handleMove(event) {
        if (!this.state.active) return;
        event.preventDefault();

        const touch = event.touches?.[0];
        const clientX = touch ? touch.clientX : event.clientX;
        const clientY = touch ? touch.clientY : event.clientY;

        let dx = clientX - this.#centerX;
        let dy = clientY - this.#centerY;
        const distance = Math.hypot(dx, dy);

        this.state.angle = Math.atan2(dx, -dy);

        const maxDistance = this.#radius - this.#thumbElement.clientWidth / 2;
        this.state.strength = Math.min(distance, maxDistance) / maxDistance;

        if (distance > maxDistance) {
            dx = Math.sin(this.state.angle) * maxDistance;
            dy = -Math.cos(this.state.angle) * maxDistance;
        }

        this.#thumbElement.style.transform =
            `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    }

    /** 入力終了時にリセットする */
    #handleEnd(event) {
        if (!this.state.active) return;
        event.preventDefault();

        this.state.active = false;
        this.state.strength = 0;
        this.#thumbElement.style.transform = 'translate(-50%, -50%)';
    }

    /** 現在のステートを返す */
    getState() {
        return this.state;
    }
}