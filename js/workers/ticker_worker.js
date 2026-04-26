let intervalId = null;
let targetEndTime = 0;
let remainingSeconds = 0;

function stopTicker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTicker(seconds) {
  stopTicker();
  remainingSeconds = seconds;
  targetEndTime = Date.now() + seconds * 1000;

  postMessage({
    type: "tick",
    payload: { remaining: remainingSeconds },
  });

  intervalId = setInterval(() => {
    const diffMs = targetEndTime - Date.now();
    remainingSeconds = Math.max(0, Math.ceil(diffMs / 1000));

    postMessage({
      type: "tick",
      payload: { remaining: remainingSeconds },
    });

    if (remainingSeconds <= 0) {
      stopTicker();
      postMessage({ type: "done" });
    }
  }, 200);
}

self.onmessage = (event) => {
  const { type, payload } = event.data;

  if (type === "start") {
    startTicker(payload.duration);
  }

  if (type === "resume") {
    startTicker(payload.remaining);
  }

  if (type === "pause") {
    stopTicker();
  }
};
