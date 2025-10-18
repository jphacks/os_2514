// =================================================================================
// UI Manager (UIManager.js)
// 責務：ゲーム UI に関わる全ての DOM 要素を管理し、状態更新メソッドを提供する。
// =================================================================================
export default class UIManager {
    // --- DOM 要素参照 ---------------------------------------------------------
    scoreboard = document.getElementById('scoreboard');
    scoreAlphaEl = document.getElementById('score-alpha');
    scoreBravoEl = document.getElementById('score-bravo');
    timerEl = document.getElementById('timer');

    debugMonitor = document.getElementById('debug-monitor');
    debugPlayerState = document.getElementById('debug-player-state');
    debugPlayerPos = document.getElementById('debug-player-pos');
    debugBallOwner = document.getElementById('debug-ball-owner');
    debugResetButton = document.getElementById('debug-reset-button');

    powerGaugeContainer = document.getElementById('power-gauge-container');
    powerGaugeFill = document.getElementById('power-gauge');

    goalEffectEl = document.getElementById('goal-effect');

    constructor() {
        this.#initializeScoreboard();
        this.#bindDebugMonitorToggle();
    }

    /**
     * スコアボードの値を最新スコアで上書きする。
     * @param {{ alpha: number, bravo: number }} score
     */
    updateScoreboard(score) {
        if (!this.scoreAlphaEl || !this.scoreBravoEl) return;
        this.scoreAlphaEl.textContent = score.alpha;
        this.scoreBravoEl.textContent = score.bravo;
    }

    /**
     * 残り時間を mm:ss 形式で表示する。
     * @param {number} time 残り秒数
     */
    updateTimer(time) {
        if (!this.timerEl) return;
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * デバッグモニタにプレイヤーとボールの情報を反映する。
     * @param {PlayerModel|null} playerModel
     * @param {BallModel} ballModel
     */
    updateDebugMonitor(playerModel, ballModel) {
        if (!playerModel || !this.debugMonitor) return;

        const toFixed = (value) => value.toFixed(1);
        const position = playerModel.getPosition();

        if (this.debugPlayerState) {
            this.debugPlayerState.textContent = playerModel.getState();
            console.log(playerModel.getState());
        }
        if (this.debugPlayerPos) {
            this.debugPlayerPos.textContent = `x:${toFixed(position.x)} z:${toFixed(position.z)}`;
        }

        const ownerId = ballModel?.getOwner();
        if (this.debugBallOwner) {
            this.debugBallOwner.textContent = ownerId ?? 'None';
        }
    }

    /**
     * キックチャージゲージを表示する。
     */
    showPowerGauge() {
        if (!this.powerGaugeContainer) return;
        this.powerGaugeContainer.style.display = 'block';
    }

    /**
     * キックチャージゲージを非表示にし、ゲージ値をリセットする。
     */
    hidePowerGauge() {
        if (!this.powerGaugeContainer) return;
        this.powerGaugeContainer.style.display = 'none';
        if (this.powerGaugeFill) {
            this.powerGaugeFill.style.width = '0%';
        }
    }

    /**
     * チャージゲージの充填割合を 0〜1 で受け取り、幅を更新する。
     * @param {number} ratio
     */
    updatePowerGauge(ratio) {
        if (!this.powerGaugeFill) return;
        const clamped = Math.max(0, Math.min(1, ratio));
        this.powerGaugeFill.style.width = `${Math.round(clamped * 100)}%`;
    }

    /**
     * デバッグ用リセットボタンを返す。
     * @returns {HTMLButtonElement|null}
     */
    getResetButton() {
        return this.debugResetButton;
    }

    /**
     * ゴール演出メッセージを表示する。
     * @param {'alpha'|'bravo'} team ゴールを決めたチーム
     * @param {PlayerModel|null} scorerModel ゴールを決めたプレイヤー
     */
    showGoalEffect(team, scorerModel) {
        if (!this.goalEffectEl) return;

        const teamName = team === 'alpha' ? 'アルファ' : 'ブラボー';
        const scorerName = !scorerModel
            ? 'オウンゴール'
            : scorerModel.isUser()
                ? 'あなた'
                : scorerModel.getId();

        this.goalEffectEl.textContent = `${teamName}チームのゴール！ (${scorerName})`;
        this.goalEffectEl.style.color = team === 'alpha' ? '#ff4141' : '#4195ff';
        this.goalEffectEl.style.opacity = '1';

        window.setTimeout(() => {
            if (this.goalEffectEl) {
                this.goalEffectEl.style.opacity = '0';
            }
        }, 2500);
    }

    /**
     * スコアボード表示を初期化し、存在しない場合は警告を出す。
     */
    #initializeScoreboard() {
        if (!this.scoreboard) {
            console.warn('[UIManager] scoreboard 要素が見つかりません。');
            return;
        }
        this.scoreboard.style.display = 'flex';
    }

    /**
     * デバッグモニタの見出しクリックで折りたたみを切り替える。
     */
    #bindDebugMonitorToggle() {
        if (!this.debugMonitor) return;
        const heading = this.debugMonitor.querySelector('h3');
        heading?.addEventListener('click', () => {
            this.debugMonitor.classList.toggle('collapsed');
        });
    }
}