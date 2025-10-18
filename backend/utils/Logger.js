const ENV = require('../config/environment');

class Logger {
  constructor() {
    this.level = ENV.LOG_LEVEL || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };

    // 同一メッセージのスパム抑制（デフォルト 1000ms）
    this.throttleMs = Number(ENV.LOG_THROTTLE_MS || process.env.LOG_THROTTLE_MS || 1000);
    this._throttle = new Map(); // key -> { last, suppressed }
  }

  setLevel(level) {
    if (level in this.levels) this.level = level;
  }

  _shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  _emit(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(prefix, message, data);
    } else if (level === 'warn') {
      console.warn(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }
  }

  _log(level, message, data = {}) {
    if (!this._shouldLog(level)) return;

    // スパム抑制（同一 level+message でまとめる）
    if (this.throttleMs > 0) {
      const key = `${level}|${message}`;
      const now = Date.now();
      const entry = this._throttle.get(key) || { last: 0, suppressed: 0 };

      if (now - entry.last < this.throttleMs) {
        entry.suppressed += 1;
        this._throttle.set(key, entry);
        return;
      }

      // 抑制分が貯まっていたらまとめて通知
      if (entry.suppressed > 0) {
        this._emit(level, `${message} (+${entry.suppressed} suppressed)`, data);
      } else {
        this._emit(level, message, data);
      }

      entry.last = now;
      entry.suppressed = 0;
      this._throttle.set(key, entry);
      return;
    }

    // 抑制なし
    this._emit(level, message, data);
  }

  error(message, data) { this._log('error', message, data); }
  warn(message, data)  { this._log('warn', message, data); }
  info(message, data)  { this._log('info', message, data); }
  debug(message, data) { this._log('debug', message, data); }
}

module.exports = new Logger();