// =================================================================================
// UI Manager (UIManager.js)
// 責務：全てのDOM要素の参照を保持し、UIの更新メソッドを提供する。
// =================================================================================
export default class UIManager {
    // DOM Elements
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
    
    constructor() {
        this.scoreboard.style.display = 'flex';
        this.debugMonitor.querySelector('h3').addEventListener('click', () => {
            this.debugMonitor.classList.toggle('collapsed');
        });
    }

    updateScoreboard(score) {
        this.scoreAlphaEl.textContent = score.alpha;
        this.scoreBravoEl.textContent = score.bravo;
    }

    updateTimer(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDebugMonitor(playerModel, ballModel) {
        if (!playerModel) return;
        const toFixed = (v) => v.toFixed(1);
        
        this.debugPlayerState.textContent = playerModel.getState();
        const pos = playerModel.getPosition();
        this.debugPlayerPos.textContent = `x:${toFixed(pos.x)} z:${toFixed(pos.z)}`;
        
        const ownerId = ballModel.getOwner();
        this.debugBallOwner.textContent = ownerId ? ownerId : 'None';
    }

    updateDebugMonitor(playerModel, ballModel) {
        if (!playerModel) return;
        const toFixed = (v) => v.toFixed(1);
        
        this.debugPlayerState.textContent = playerModel.getState();
        const pos = playerModel.getPosition();
        this.debugPlayerPos.textContent = `x:${toFixed(pos.x)} z:${toFixed(pos.z)}`;
        
        const ownerId = ballModel.getOwner();
        this.debugBallOwner.textContent = ownerId ? ownerId : 'None';
    }

    showPowerGauge() {
        if (!this.powerGaugeContainer) return;
        this.powerGaugeContainer.style.display = 'block';
    }

    hidePowerGauge() {
        if (!this.powerGaugeContainer) return;
        this.powerGaugeContainer.style.display = 'none';
        if (this.powerGaugeFill) {
            this.powerGaugeFill.style.width = '0%';
        }
    }

    updatePowerGauge(ratio) {
        if (!this.powerGaugeFill) return;
        const clamped = Math.max(0, Math.min(1, ratio));
        this.powerGaugeFill.style.width = `${Math.round(clamped * 100)}%`;
    }

    getResetButton() {
        return this.debugResetButton;
    }

    showGoalEffect(team, scorer) {
        // ...
    }
}