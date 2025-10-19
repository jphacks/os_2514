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
    statusIndicator = document.getElementById('status-indicator');

    prevScore = { alpha: 0, bravo: 0 };
    lastTimerWarning = false;

    constructor() {
        this.#initializeScoreboard();
        this.#bindDebugMonitorToggle();
        this.#addTouchFeedback();
        this.#setupResponsiveMinimap();
        this.#setupResponsiveFingerTracking();
    }

    #initializeScoreboard() {
        if (!this.scoreboard) {
            console.warn('[UIManager] scoreboard 要素が見つかりません。');
            return;
        }
        this.scoreboard.style.display = 'flex';
    }

    updateScoreboard(score) {
        if (!this.scoreAlphaEl || !this.scoreBravoEl) return;
        if (score.alpha !== this.prevScore.alpha) {
            this.#animateScoreChange(this.scoreAlphaEl);
        }
        if (score.bravo !== this.prevScore.bravo) {
            this.#animateScoreChange(this.scoreBravoEl);
        }
        this.scoreAlphaEl.textContent = score.alpha;
        this.scoreBravoEl.textContent = score.bravo;
        this.prevScore = { ...score };
    }

    #animateScoreChange(element) {
        element.style.transform = 'scale(1.3)';
        element.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    updateTimer(time) {
        if (!this.timerEl) return;
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (time < 10 && !this.lastTimerWarning) {
            this.timerEl.style.color = '#ff4141';
            this.timerEl.style.animation = 'timerPulse 1s infinite';
            this.lastTimerWarning = true;
            this.#addTimerPulseAnimation();
        } else if (time >= 10 && this.lastTimerWarning) {
            this.timerEl.style.color = '';
            this.timerEl.style.animation = '';
            this.lastTimerWarning = false;
        }
    }

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

    showPowerGauge() {
        if (!this.powerGaugeContainer) return;
        this.powerGaugeContainer.style.display = 'block';
        this.powerGaugeContainer.style.animation = 'gaugeSlideIn 0.3s ease-out';
        this.#addGaugeAnimations();
    }

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

    updatePowerGauge(ratio) {
        if (!this.powerGaugeFill) return;
        const clamped = Math.max(0, Math.min(1, ratio));
        this.powerGaugeFill.style.width = `${Math.round(clamped * 100)}%`;
        const glowIntensity = 20 + (clamped * 30);
        this.powerGaugeFill.style.boxShadow = `
            0 0 ${glowIntensity}px rgba(76,175,80,${0.8 + clamped * 0.2}),
            inset 0 2px 8px rgba(255,255,255,0.3)
        `;
    }

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

    showStatus(text, duration = 1200) {
        if (!this.statusIndicator) return;
        this.statusIndicator.textContent = text;
        this.statusIndicator.classList.add('show');
        setTimeout(() => {
            this.statusIndicator.classList.remove('show');
        }, duration);
    }

    updateDebugMonitor(playerModel, ballModel) {
        if (!playerModel || !this.debugMonitor) return;
        const toFixed = (v) => v.toFixed(1);
        if (this.debugPlayerState) {
            this.debugPlayerState.textContent = playerModel.getState();
        }
        if (this.debugPlayerPos) {
            const pos = playerModel.getPosition();
            this.debugPlayerPos.textContent = `x:${toFixed(pos.x)} z:${toFixed(pos.z)}`;
        }
        if (this.debugBallOwner) {
            const ownerId = ballModel?.getOwner();
            this.debugBallOwner.textContent = ownerId ? ownerId : 'None';
        }
    }

    #bindDebugMonitorToggle() {
        if (!this.debugMonitor) return;
        const heading = this.debugMonitor.querySelector('h3');
        heading?.addEventListener('click', () => {
            this.debugMonitor.classList.toggle('collapsed');
        });
    }

    #addTouchFeedback() {
        const buttons = [this.debugResetButton];
        buttons.forEach(button => {
            if (!button) return;
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.95)';
            }, { passive: true });
            button.addEventListener('touchend', (e) => {
                button.style.transform = 'scale(1)';
            }, { passive: true });
        });
    }

    getResetButton() {
        return this.debugResetButton;
    }

    showGoalEffect(team, scorerModel) {
        // Main.jsで上書きされる
    }

    // --- レスポンシブ対応: ミニマップ ---
    #setupResponsiveMinimap() {
        const resizeMinimapCanvas = () => {
            const canvas = document.getElementById("minimap-canvas");
            const parent = canvas?.parentElement;
            if (!canvas || !parent) return;
            const rect = parent.getBoundingClientRect();
            canvas.width = Math.round(rect.width);
            canvas.height = Math.round(rect.height);
        };
        window.addEventListener('DOMContentLoaded', resizeMinimapCanvas);
        window.addEventListener('resize', resizeMinimapCanvas);
    }

    // --- レスポンシブ対応: 指トラッキング ---
    #setupResponsiveFingerTracking() {
        const resizeFingerTrackingCanvas = () => {
            const pane = document.getElementById('finger-tracking-pane');
            const canvas = document.getElementById('finger-canvas');
            if (!pane || !canvas) return;
            const rect = pane.getBoundingClientRect();
            canvas.width = Math.round(rect.width);
            canvas.height = Math.round(rect.height);
        };
        window.addEventListener('DOMContentLoaded', resizeFingerTrackingCanvas);
        window.addEventListener('resize', resizeFingerTrackingCanvas);
    }
}