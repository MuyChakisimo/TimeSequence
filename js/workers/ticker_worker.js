let intervalId = null;
let targetEndTime = 0;
let totalDurationMs = 0;
let mode = "countdown";
let overtimeBaseMs = 0;
let overtimeStartedAt = 0;

function stopTicker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTicker(seconds, fullDurationSeconds = seconds) {
  stopTicker();

  mode = "countdown";
  totalDurationMs = fullDurationSeconds * 1000;
  targetEndTime = Date.now() + seconds * 1000;

  intervalId = setInterval(() => {
    const now = Date.now();
    const remainingMs = Math.max(0, targetEndTime - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    postMessage({
      type: "tick",
      payload: {
        remaining: remainingSeconds,
        remainingMs,
        durationMs: totalDurationMs,
      },
    });

    if (remainingMs <= 0) {
      stopTicker();
      postMessage({ type: "done" });
    }
  }, 50);
}

function startOverrun(elapsedSeconds = 0) {
  stopTicker();

  mode = "overrun";
  overtimeBaseMs = elapsedSeconds * 1000;
  overtimeStartedAt = Date.now();

  intervalId = setInterval(() => {
    const now = Date.now();
    const elapsedMs = overtimeBaseMs + (now - overtimeStartedAt);
    const elapsedSecondsNow = Math.floor(elapsedMs / 1000);

    postMessage({
      type: "overtime-tick",
      payload: {
        elapsed: elapsedSecondsNow,
        elapsedMs,
      },
    });
  }, 50);
}

self.onmessage = (event) => {
  const { type, payload } = event.data;

  if (type === "start") {
    startTicker(payload.duration, payload.duration);
  }

  if (type === "resume") {
    startTicker(payload.remaining, payload.fullDuration);
  }

  if (type === "startOverrun") {
    startOverrun(0);
  }

  if (type === "resumeOverrun") {
    startOverrun(payload.elapsed || 0);
  }

  if (type === "pause") {
    stopTicker();
  }
};
