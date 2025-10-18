/**
 * キーボード入力を監視し、キー状態とイベント通知を提供する。
 */
export default class InputHandler {
    keys;
    #downListeners;
    #upListeners;

    /**
     * 入力状態テーブルとリスナー集合を初期化する。
     */
    constructor() {
        /** @type {Record<string, boolean>} 押下中のキー状態 */
        this.keys = Object.create(null);
        this.#downListeners = new Map();
        this.#upListeners = new Map();
        this.#bindEvents();
    }

    /**
     * 指定キー押下時のコールバックを登録する。
     * @param {string} code KeyboardEvent.code
     * @param {(event: KeyboardEvent) => void} callback
     * @returns {() => void} 登録解除関数
     */
    onKeyDown(code, callback) {
        this.#registerListener(this.#downListeners, code, callback);
        return () => this.#downListeners.get(code)?.delete(callback);
    }

    /**
     * 指定キー解放時のコールバックを登録する。
     * @param {string} code KeyboardEvent.code
     * @param {(event: KeyboardEvent) => void} callback
     * @returns {() => void} 登録解除関数
     */
    onKeyUp(code, callback) {
        this.#registerListener(this.#upListeners, code, callback);
        return () => this.#upListeners.get(code)?.delete(callback);
    }

    /**
     * 現在のキー押下状態を取得する。
     * @returns {Record<string, boolean>}
     */
    getState() {
        // 呼び出し側による破壊的変更を防ぐためコピーを返す
        return { ...this.keys };
    }

    #bindEvents() {
        // DOMイベントからキー入力を捕捉して内部状態とリスナーへ反映
        document.addEventListener('keydown', (event) => this.#handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.#handleKeyUp(event));
    }

    #handleKeyDown(event) {
        // 連続送信を避けるため、既に押下中なら無視
        if (this.keys[event.code]) return;
        this.keys[event.code] = true;
        this.#emit(this.#downListeners, event.code, event);
    }

    #handleKeyUp(event) {
        // 押下状態でないキーアップは無視
        if (!this.keys[event.code]) return;
        this.keys[event.code] = false;
        this.#emit(this.#upListeners, event.code, event);
    }

    #registerListener(map, code, callback) {
        if (!map.has(code)) {
            map.set(code, new Set());
        }
        // キーごとのリスナー集合を確保して登録
        map.get(code).add(callback);
    }

    #emit(listeners, code, event) {
        // 指定キーとワイルドカード(*)の両方へイベントを配信
        listeners.get(code)?.forEach((cb) => cb(event));
        listeners.get('*')?.forEach((cb) => cb(code, event));
    }
}