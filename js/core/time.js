export function formatSecondsToClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function normalizeDuration(hours, minutes, seconds) {
  const h = Math.max(0, Number(hours) || 0);
  const m = Math.max(0, Number(minutes) || 0);
  const s = Math.max(0, Number(seconds) || 0);

  return h * 3600 + m * 60 + s;
}
