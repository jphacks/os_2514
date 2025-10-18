import { HandTracker } from './hand.js';

// MediaPipe からの生状態を外部公開用に正規化するマップ
const STATE_MAP = {
  NONE: 'IDLE',
  RUN: 'RUN',
  CHARGE: 'CHARGE',
  KICK: 'KICK',
};

export class HandTrackingPresenter {
  // 内部トackerおよびスナップショット保持
  #tracker = null;
  #state = 'IDLE';
  #confidence = 0;
  #charge = 0;
  #actionState = null;
  #externalOnResult = null;
  #internalForwarder = null;

  static async create(options = {}) {
    const presenter = new HandTrackingPresenter();
    await presenter.#initialize(options);
    return presenter;
  }

  constructor() {}

  // 現在利用中の HandTracker インスタンス
  get tracker() {
    return this.#tracker;
  }

  // 最新の状態（IDLE/RUN/CHARGE/KICK）
  get state() {
    return this.#state;
  }

  // 推定信頼度（0-1）
  get confidence() {
    return this.#confidence;
  }

  // 蓄積チャージ量（0-1）
  get charge() {
    return this.#charge;
  }

  // HandTracker の生アクション状態オブジェクト
  get actionState() {
    return this.#actionState;
  }

  // 状態判定補助ゲッター
  get isIdle() {
    return this.#state === 'IDLE';
  }

  get isRunning() {
    return this.#state === 'RUN';
  }

  get isCharging() {
    return this.#state === 'CHARGE';
  }

  get isKicking() {
    return this.#state === 'KICK';
  }

  // HandTracker の開始
  async start() {
    if (this.#tracker?.start) {
      await this.#tracker.start();
    }
  }

  // HandTracker の停止
  async stop() {
    if (this.#tracker?.stop) {
      await this.#tracker.stop();
    }
  }

  // リソース解放
  dispose() {
    if (this.#tracker?.dispose) {
      this.#tracker.dispose();
    }
    this.#tracker = null;
    this.#internalForwarder = null;
    this.#externalOnResult = null;
  }

  async #initialize(options) {
    const {
      tracker,
      onResult: externalOnResult,
      ...trackerOptions
    } = options;

    this.#externalOnResult = typeof externalOnResult === 'function' ? externalOnResult : null;

    // 内部で状態更新と外部コールバック転送を行うフォワーダー
    const originalOptionOnResult = trackerOptions.onResult;
    this.#internalForwarder = (payload) => {
      this.#updateSnapshot(payload);
      if (this.#externalOnResult) this.#externalOnResult(payload);
      if (typeof originalOptionOnResult === 'function') originalOptionOnResult(payload);
    };

    // 既存トacker をラップする場合
    if (tracker) {
      this.#tracker = tracker;
      this.#hookExistingTracker();
      this.#syncSnapshotFromTracker();
      return;
    }

    // 新規 HandTracker を生成する場合
    const created = await this.#createTrackerInstance(trackerOptions);
    this.#tracker = created;
    this.#syncSnapshotFromTracker();
  }

  // HandTracker の生成ラッパー
  async #createTrackerInstance(trackerOptions) {
    const optionsWithForwarder = { ...trackerOptions, onResult: this.#internalForwarder };
    if (typeof HandTracker?.create === 'function') {
      const instance = await HandTracker.create(optionsWithForwarder);
      if (instance instanceof HandTracker) return instance;
      if (instance?.tracker) return instance.tracker;
      return instance;
    }
    return new HandTracker(optionsWithForwarder);
  }

  // 既存トacker の onResult を差し替えつつ連携
  #hookExistingTracker() {
    if (!this.#tracker) return;
    const prevHandler = typeof this.#tracker.onResult === 'function' ? this.#tracker.onResult.bind(this.#tracker) : null;
    this.#tracker.onResult = (payload) => {
      this.#internalForwarder?.(payload);
      if (prevHandler && prevHandler !== this.#internalForwarder) {
        prevHandler(payload);
      }
    };
  }

  // 初期スナップショットの同期
  #syncSnapshotFromTracker() {
    const snapshot = this.#tracker?.actionState ?? null;
    this.#updateSnapshot(snapshot);
  }

  // 内部状態を最新ペイロードで更新
  #updateSnapshot(payload) {
    this.#actionState = payload ?? null;
    const rawState = payload?.state ?? 'NONE';
    this.#state = HandTrackingPresenter.normalizeState(rawState);
    this.#confidence = payload?.confidence ?? 0;
    this.#charge = payload?.charge ?? 0;
  }

  // 外部公開用の状態文字列へ正規化
  static normalizeState(state) {
    return STATE_MAP[state] ?? 'IDLE';
  }
}

export default HandTrackingPresenter;