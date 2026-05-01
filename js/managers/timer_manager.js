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

    this.overrun = false;
    this.overrunElapsed = 0;
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

      if (type === "overtime-tick") {
        this.overrun = true;
        this.overrunElapsed = payload.elapsed;

        this.bus.emit("timer:tick", {
          remaining: -payload.elapsed,
          duration: 0,
          progress: 0,
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
    this.overrun = false;
    this.overrunElapsed = 0;
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

  startOverrun() {
    this.overrun = true;
    this.overrunElapsed = 0;
    this.currentDuration = 0;
    this.remaining = 0;
    this.running = true;
    this.paused = false;

    this.worker.postMessage({
      type: "startOverrun",
    });

    this.logger.info("Continuous overrun started");
  }

  pause() {
    if (!this.running) return;

    this.running = false;
    this.paused = true;

    this.worker.postMessage({ type: "pause" });

    this.logger.info("Timer paused", {
      remaining: this.remaining,
      overrunElapsed: this.overrunElapsed,
      overrun: this.overrun,
    });
  }

  resume() {
    if (this.running) return;

    this.running = true;
    this.paused = false;

    if (this.overrun) {
      this.worker.postMessage({
        type: "resumeOverrun",
        payload: {
          elapsed: this.overrunElapsed,
        },
      });

      this.logger.info("Continuous overrun resumed", {
        elapsed: this.overrunElapsed,
      });
      return;
    }

    if (this.remaining <= 0) return;

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
    this.overrun = false;
    this.overrunElapsed = 0;
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
    this.overrun = false;
    this.overrunElapsed = 0;
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

  isOverrun() {
    return this.overrun;
  }

  getRemaining() {
    return this.remaining;
  }

  getOverrunElapsed() {
    return this.overrunElapsed;
  }
}
