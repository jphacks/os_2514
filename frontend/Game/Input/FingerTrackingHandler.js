/**
 * 指トラッキングを管理し、HandTrackingPresenter から受信した情報を
 * 状態・イベントとしてゲーム側へ提供する。
 */
import HandTrackingPresenter from '../../FingerTracking/HandTrackingPresenter.js';
import { PlayerStates } from '../ConstData/PlayerStates.js';

const STATE_MAP = Object.freeze({
    IDLE: PlayerStates.Idle,
    RUN: PlayerStates.Run,
    CHARGE: PlayerStates.Charge,
    KICK: PlayerStates.Kick,
});

const EVENT_TYPES = Object.freeze({
    READY: 'ready',
    STATE_CHANGE: 'statechange',
    CHARGE_CHANGE: 'chargechange',
    CONFIDENCE_CHANGE: 'confidencechange',
    RESULT: 'result',
    ERROR: 'error',
});

/**
 * HandTrackingPresenter をラップし、イベント駆動で FingerTracking の結果を配信する。
 */
export default class FingerTrackingHandler {
    #presenter = null;
    #listeners = new Map();
    #state = PlayerStates.Idle;
    #charge = 0;
    #confidence = 0;
    #actionState = null;
    #running = false;
    #ready = false;

    /**
     * ファクトリ。初期化完了後のハンドラを返す。
     * @param {object} options HandTrackingPresenter へ引き渡す設定
     * @returns {Promise<FingerTrackingHandler>}
     */
    static async create(options = {}) {
        const handler = new FingerTrackingHandler();
        await handler.#initialize(options);
        return handler;
    }

    constructor() {
        Object.values(EVENT_TYPES).forEach((type) => this.#listeners.set(type, new Set()));
    }

    /**
     * HandTrackingPresenter を初期化し、イベントを購読する。
     * @param {object} options
     */
    async #initialize(options = {}) {
        const {
            autoStart = true,
            onStateChange,
            onChargeChange,
            onConfidenceChange,
            onResult,
            onError,
            ...presenterOptions
        } = options;

        if (onStateChange) this.on(EVENT_TYPES.STATE_CHANGE, onStateChange);
        if (onChargeChange) this.on(EVENT_TYPES.CHARGE_CHANGE, onChargeChange);
        if (onConfidenceChange) this.on(EVENT_TYPES.CONFIDENCE_CHANGE, onConfidenceChange);
        if (onResult) this.on(EVENT_TYPES.RESULT, onResult);
        if (onError) this.on(EVENT_TYPES.ERROR, onError);

        const chainedOnResult = presenterOptions.onResult;
        try {
            this.#presenter = await HandTrackingPresenter.create({
                ...presenterOptions,
                onResult: (payload) => {
                    this.#handlePresenterResult(payload);
                    chainedOnResult?.(payload);
                },
            });

            this.#syncFromPresenter();
            this.#ready = true;
            this.#emit(EVENT_TYPES.READY, this.getSnapshot());

            if (autoStart) {
                await this.start();
            }
        } catch (error) {
            this.#emit(EVENT_TYPES.ERROR, error);
            throw error;
        }
    }

    /**
     * 指トラッキングを開始する。
     */
    async start() {
        if (!this.#presenter || this.#running) return;
        await this.#presenter.start();
        this.#running = true;
    }

    /**
     * 指トラッキングを停止する。
     */
    async stop() {
        if (!this.#presenter || !this.#running) return;
        await this.#presenter.stop();
        this.#running = false;
    }

    /**
     * 内部リソースを解放する。
     */
    async dispose() {
        await this.stop();
        this.#presenter?.dispose?.();
        this.#presenter = null;
        this.#listeners.forEach((set) => set.clear());
        this.#actionState = null;
        this.#ready = false;
    }

    /**
     * 最新状態のスナップショットを返す。
     * @returns {{state: string, charge: number, confidence: number, actionState: object|null, running: boolean, ready: boolean}}
     */
    getSnapshot() {
        return {
            state: this.#state,
            charge: this.#charge,
            confidence: this.#confidence,
            actionState: this.#actionState,
            running: this.#running,
            ready: this.#ready,
        };
    }

    /**
     * 現在の状態を取得する。
     * @returns {string}
     */
    getState() {
        return this.#state;
    }

    /**
     * 現在のチャージ量を取得する。
     * @returns {number}
     */
    getCharge() {
        return this.#charge;
    }

    /**
     * 現在の信頼度を取得する。
     * @returns {number}
     */
    getConfidence() {
        return this.#confidence;
    }

    /**
     * HandTrackingPresenter への参照を返す。
     * @returns {HandTrackingPresenter|null}
     */
    getPresenter() {
        return this.#presenter;
    }

    /**
     * 初期化済みかどうか。
     * @returns {boolean}
     */
    isReady() {
        return this.#ready;
    }

    /**
     * トラッキングが稼働中かどうか。
     * @returns {boolean}
     */
    isRunning() {
        return this.#running;
    }

    /**
     * イベントを購読する。
     * @param {string} eventType
     * @param {(payload: any) => void} callback
     * @returns {() => void} 登録解除関数
     */
    on(eventType, callback) {
        const bucket = this.#listeners.get(eventType);
        if (!bucket || typeof callback !== 'function') {
            return () => undefined;
        }
        bucket.add(callback);
        return () => this.off(eventType, callback);
    }

    /**
     * イベント購読を解除する。
     * @param {string} eventType
     * @param {(payload: any) => void} callback
     */
    off(eventType, callback) {
        this.#listeners.get(eventType)?.delete(callback);
    }

    /**
     * HandTrackingPresenter からの結果を受けて内部状態を更新する。
     * @param {object|null} payload
     */
    #handlePresenterResult(payload) {
        const prevState = this.#state;
        const prevCharge = this.#charge;
        const prevConfidence = this.#confidence;

        this.#syncFromPresenter(payload);

        this.#emit(EVENT_TYPES.RESULT, this.#actionState);

        if (prevState !== this.#state) {
            this.#emit(EVENT_TYPES.STATE_CHANGE, { previous: prevState, current: this.#state });
        }
        if (Math.abs(prevCharge - this.#charge) > 1e-4) {
            this.#emit(EVENT_TYPES.CHARGE_CHANGE, this.#charge);
        }
        if (Math.abs(prevConfidence - this.#confidence) > 1e-4) {
            this.#emit(EVENT_TYPES.CONFIDENCE_CHANGE, this.#confidence);
        }
    }

    /**
     * Presenter から最新状態を取得し反映する。
     * @param {object|null} payload
     */
    #syncFromPresenter(payload = null) {
        const action = payload ?? this.#presenter?.actionState ?? null;
        const stateKey = (payload?.state ?? this.#presenter?.state ?? 'IDLE').toUpperCase();
        this.#state = STATE_MAP[stateKey] ?? PlayerStates.Idle;
        this.#charge = payload?.charge ?? this.#presenter?.charge ?? 0;
        this.#confidence = payload?.confidence ?? this.#presenter?.confidence ?? 0;
        this.#actionState = action;
    }

    /**
     * 指定イベントのリスナーへ通知する。
     * @param {string} eventType
     * @param {any} payload
     */
    #emit(eventType, payload) {
        this.#listeners.get(eventType)?.forEach((listener) => listener(payload));
    }
}