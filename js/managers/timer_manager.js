export class TimerManager {
  constructor(bus, audio, logger) {
    this.bus = bus;
    this.audio = audio;
    this.logger = logger;
    this.worker = null;
    this.running = false;
    this.paused = false;
    this.currentDuration = 0;
    this.remaining = 0;
  }

  init() {
    this.worker = new Worker("./js/workers/ticker_worker.js", {
      type: "module",
    });

    this.worker.onmessage = (event) => {
      const { type, payload } = event.data;

      if (type === "tick") {
        this.remaining = payload.remaining;

        if (this.remaining > 0 && this.running) {
          this.paused = false;
        }

        const remainingMs = payload.remainingMs;
        const durationMs = payload.durationMs;

        this.bus.emit("timer:tick", {
          remaining: this.remaining,
          duration: this.currentDuration,
          progress: durationMs > 0 ? (remainingMs / durationMs) * 100 : 0,
        });
      }

      if (type === "done") {
        this.running = false;
        this.paused = false;
        this.remaining = 0;

        this.bus.emit("timer:tick", {
          remaining: 0,
          duration: this.currentDuration,
          progress: 0,
        });

        this.bus.emit("timer:completed");
      }
    };
  }

  start(duration) {
    this.currentDuration = duration;
    this.remaining = duration;
    this.running = true;
    this.paused = false;

    this.worker.postMessage({
      type: "start",
      payload: { duration },
    });

    this.logger.info("Timer started", { duration });
  }

  pause() {
    if (!this.running) return;

    this.running = false;
    this.paused = this.remaining > 0;

    this.worker.postMessage({ type: "pause" });

    this.logger.info("Timer paused", { remaining: this.remaining });
  }

  resume() {
    if (this.running || this.remaining <= 0) return;

    this.running = true;
    this.paused = false;

    this.worker.postMessage({
      type: "resume",
      payload: {
        remaining: this.remaining,
        fullDuration: this.currentDuration,
      },
    });

    this.logger.info("Timer resumed", {
      remaining: this.remaining,
      fullDuration: this.currentDuration,
    });
  }

  reset(duration) {
    this.running = false;
    this.paused = true;
    this.currentDuration = duration;
    this.remaining = duration;

    this.worker.postMessage({ type: "pause" });

    this.bus.emit("timer:tick", {
      remaining: duration,
      duration,
      progress: 100,
    });

    this.logger.info("Timer reset", { duration });
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.currentDuration = 0;
    this.remaining = 0;

    this.worker.postMessage({ type: "pause" });
    this.bus.emit("timer:stopped");
  }

  buzz(enabled) {
    this.audio.buzz(enabled);
  }

  isRunning() {
    return this.running;
  }

  isPaused() {
    return this.paused;
  }

  getRemaining() {
    return this.remaining;
  }
}
