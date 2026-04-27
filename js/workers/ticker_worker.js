let intervalId = null;
let targetEndTime = 0;
let totalDurationMs = 0;

function stopTicker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTicker(seconds, fullDurationSeconds = seconds) {
  stopTicker();

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

self.onmessage = (event) => {
  const { type, payload } = event.data;

  if (type === "start") {
    startTicker(payload.duration, payload.duration);
  }

  if (type === "resume") {
    startTicker(payload.remaining, payload.fullDuration);
  }

  if (type === "pause") {
    stopTicker();
  }
};
