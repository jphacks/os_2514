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
    
    showGoalEffect(team, scorerModel) {
        if (!this.goalEffectEl) return;
        
        const teamName = team === 'alpha' ? 'アルファ' : 'ブラボー';
        const scorerName = scorerModel ? (scorerModel.isUser() ? "あなた" : scorerModel.getId()) : "オウンゴール";
        
        this.goalEffectEl.textContent = `${teamName}チームのゴール！ (${scorerName})`;
        this.goalEffectEl.style.color = team === 'alpha' ? '#ff4141' : '#4195ff';
        this.goalEffectEl.style.opacity = '1';

        setTimeout(() => {
            this.goalEffectEl.style.opacity = '0';
        }, 2500); // 2.5秒でフェードアウト
    }

    getResetButton() {
        return this.debugResetButton;
    }
}
