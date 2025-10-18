// =================================================================================
// 定数ファイル (PlayerStates.js)
// 責務：プレイヤーの状態を列挙型で管理する。
// =================================================================================
export class PlayerStates {
    static Idle = 'Idle';
    static Run = 'Run';
    static Charge = 'Charge';
    static Kick = 'Kick';

    static values() {
        return [this.Idle, this.Run, this.Charge, this.Kick];
    }
}

Object.freeze(PlayerStates);