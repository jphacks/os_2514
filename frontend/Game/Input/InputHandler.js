export default class InputHandler {
    keys;
    #downListeners;
    #upListeners;

    constructor() {
        this.keys = {};
        this.#downListeners = new Map();
        this.#upListeners = new Map();
        this.#addEventListeners();
    }

    onKeyDown(code, callback) {
        if (!this.#downListeners.has(code)) {
            this.#downListeners.set(code, new Set());
        }
        this.#downListeners.get(code).add(callback);
        return () => this.#downListeners.get(code)?.delete(callback);
    }

    onKeyUp(code, callback) {
        if (!this.#upListeners.has(code)) {
            this.#upListeners.set(code, new Set());
        }
        this.#upListeners.get(code).add(callback);
        return () => this.#upListeners.get(code)?.delete(callback);
    }

    #emit(listeners, code, event) {
        listeners.get(code)?.forEach((cb) => cb(event));
        listeners.get('*')?.forEach((cb) => cb(code, event));
    }

    #addEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.keys[e.code] = true;
                this.#emit(this.#downListeners, e.code, e);
            }
        });
        document.addEventListener('keyup', (e) => {
            if (this.keys[e.code]) {
                this.keys[e.code] = false;
                this.#emit(this.#upListeners, e.code, e);
            }
        });
    }

    getState() {
        return { ...this.keys };
    }
}