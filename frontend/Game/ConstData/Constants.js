// =================================================================================
// 定数ファイル (Constants.js)
// 責務：ゲーム内で使用する設定値（定数）を一元管理する。
// =================================================================================

export const FIELD_WIDTH = 100;
export const FIELD_HEIGHT = 65;
export const PLAYER_RADIUS = 1.5;
export const BALL_RADIUS = 0.75;
export const PLAYER_SPEED = 20;
export const GAME_DURATION = 300;
export const GRAVITY = -35;
export const PLAYER_Y = 1.5 + 1.5; // CapsuleGeometryの高さに依存
export const STUN_DURATION = 2.0; // スタン時間（秒）
export const MIN_KICK_FORCE = 20;
export const MAX_KICK_FORCE = 80;
export const MAX_KICK_CHARGE_TIME = 1.5;
export const KICK_VERTICAL_FORCE = 15;
export const CATCH_COOLDOWN = 0.35;
export const CATCH_HEIGHT_TOLERANCE = 2.5;
export const GOAL_WIDTH = 12;
export const GOAL_HEIGHT = 6;
export const GOAL_DEPTH = 4;
export const GOAL_POST_THICKNESS = 0.4;
export const POST_GOAL_DELAY = 2.5;