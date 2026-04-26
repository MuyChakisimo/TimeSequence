export class Logger {
  constructor(enabled = true) {
    this.enabled = enabled;
  }

  info(message, data = null) {
    if (!this.enabled) return;
    console.log(`[TimeSequence][INFO] ${message}`, data ?? "");
  }

  warn(message, data = null) {
    if (!this.enabled) return;
    console.warn(`[TimeSequence][WARN] ${message}`, data ?? "");
  }

  error(message, data = null) {
    if (!this.enabled) return;
    console.error(`[TimeSequence][ERROR] ${message}`, data ?? "");
  }
}
