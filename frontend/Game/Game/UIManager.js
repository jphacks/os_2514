// =================================================================================
// UI Manager (UIManager.js) UX改善版
// 責務：ゲーム UI に関わる全ての DOM 要素を管理し、状態更新メソッドを提供する。
//       アニメーション、トランジション、視覚フィードバックを強化。
// =================================================================================
export default class UIManager {
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

    // 前回のスコアを記憶（アニメーション用）
    prevScore = { alpha: 0, bravo: 0 };
    lastTimerWarning = false;

    constructor() {
        this.#initializeScoreboard();
        this.#bindDebugMonitorToggle();
        this.#addTouchFeedback();
    }

    /**
     * スコアボードの値を更新し、変化があればアニメーション
     */
    updateScoreboard(score) {
        if (!this.scoreAlphaEl || !this.scoreBravoEl) return;
        
        // アルファチームのスコア更新
        if (score.alpha !== this.prevScore.alpha) {
            this.scoreAlphaEl.textContent = score.alpha;
            this.#animateScoreChange(this.scoreAlphaEl);
        }
        
        // ブラボーチームのスコア更新
        if (score.bravo !== this.prevScore.bravo) {
            this.scoreBravoEl.textContent = score.bravo;
            this.#animateScoreChange(this.scoreBravoEl);
        }
        
        this.prevScore = { ...score };
    }

    /**
     * スコア変化時のアニメーション
     */
    #animateScoreChange(element) {
        element.style.transform = 'scale(1.3)';
        element.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    /**
     * 残り時間を表示し、時間切迫時に警告表示
     */
    updateTimer(time) {
        if (!this.timerEl) return;
        
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // 残り30秒で警告色
        const isWarning = time <= 30 && time > 0;
        if (isWarning && !this.lastTimerWarning) {
            this.timerEl.style.color = '#FF5722';
            this.timerEl.style.animation = 'timerPulse 1s ease-in-out infinite';
            this.#addTimerPulseAnimation();
        } else if (!isWarning && this.lastTimerWarning) {
            this.timerEl.style.color = '#fff';
            this.timerEl.style.animation = '';
        }
        
        this.lastTimerWarning = isWarning;
    }

    /**
     * タイマー点滅アニメーションを動的に追加
     */
    #addTimerPulseAnimation() {
        if (document.getElementById('timer-pulse-style')) return;
        
        const style = document.createElement('style');
        style.id = 'timer-pulse-style';
        style.textContent = `
            @keyframes timerPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * デバッグモニタの情報を更新
     */
    updateDebugMonitor(playerModel, ballModel) {
        if (!playerModel || !this.debugMonitor) return;

        const toFixed = (value) => value.toFixed(1);
        const position = playerModel.getPosition();

        if (this.debugPlayerState) {
            const state = playerModel.getState();
            this.debugPlayerState.textContent = state;
            
            // 状態によって色を変更
            const stateColors = {
                'Idle': '#4CAF50',
                'Run': '#2196F3',
                'Charge': '#FF9800',
                'Kick': '#F44336'
            };
            this.debugPlayerState.style.color = stateColors[state] || '#4CAF50';
        }
        
        if (this.debugPlayerPos) {
            this.debugPlayerPos.textContent = `x:${toFixed(position.x)} z:${toFixed(position.z)}`;
        }

        const ownerId = ballModel?.getOwner();
        if (this.debugBallOwner) {
            this.debugBallOwner.textContent = ownerId ?? 'None';
            this.debugBallOwner.style.color = ownerId ? '#FFD700' : '#999';
        }
    }

    /**
     * キックチャージゲージを表示
     */
    showPowerGauge() {
        if (!this.powerGaugeContainer) return;
        this.powerGaugeContainer.style.display = 'block';
        this.powerGaugeContainer.style.animation = 'gaugeSlideIn 0.3s ease-out';
        this.#addGaugeAnimations();
    }

    /**
     * キックチャージゲージを非表示
     */
    hidePowerGauge() {
        if (!this.powerGaugeContainer) return;
        this.powerGaugeContainer.style.animation = 'gaugeSlideOut 0.3s ease-in';
        
        setTimeout(() => {
            this.powerGaugeContainer.style.display = 'none';
            if (this.powerGaugeFill) {
                this.powerGaugeFill.style.width = '0%';
            }
        }, 300);
    }

    /**
     * チャージゲージの充填率を更新
     */
    updatePowerGauge(ratio) {
        if (!this.powerGaugeFill) return;
        const clamped = Math.max(0, Math.min(1, ratio));
        this.powerGaugeFill.style.width = `${Math.round(clamped * 100)}%`;
        
        // ゲージの影の強度を充填率に応じて変更
        const glowIntensity = 20 + (clamped * 30);
        this.powerGaugeFill.style.boxShadow = `
            0 0 ${glowIntensity}px rgba(76,175,80,${0.8 + clamped * 0.2}),
            inset 0 2px 8px rgba(255,255,255,0.3)
        `;
    }

    /**
     * ゲージアニメーションのスタイルを動的に追加
     */
    #addGaugeAnimations() {
        if (document.getElementById('gauge-animations-style')) return;
        
        const style = document.createElement('style');
        style.id = 'gauge-animations-style';
        style.textContent = `
            @keyframes gaugeSlideIn {
                from {
                    transform: translateX(-50%) translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            @keyframes gaugeSlideOut {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(20px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * デバッグ用リセットボタンを取得
     */
    getResetButton() {
        return this.debugResetButton;
    }

    /**
     * ゴール演出（Main.jsで上書きされる）
     */
    showGoalEffect(team, scorerModel) {
        // この関数は Main.js で上書きされる
    }

    /**
     * スコアボード表示を初期化
     */
    #initializeScoreboard() {
        if (!this.scoreboard) {
            console.warn('[UIManager] scoreboard 要素が見つかりません。');
            return;
        }
        this.scoreboard.style.display = 'flex';
    }

    /**
     * デバッグモニタの折りたたみ機能
     */
    #bindDebugMonitorToggle() {
        if (!this.debugMonitor) return;
        const heading = this.debugMonitor.querySelector('h3');
        
        heading?.addEventListener('click', () => {
            this.debugMonitor.classList.toggle('collapsed');
        });
    }

    /**
     * ボタンにタッチフィードバックを追加
     */
    #addTouchFeedback() {
        const buttons = [this.debugResetButton];
        
        buttons.forEach(button => {
            if (!button) return;
            
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.95)';
            });
            
            button.addEventListener('touchend', (e) => {
                button.style.transform = 'scale(1)';
            });
        });
    }
}