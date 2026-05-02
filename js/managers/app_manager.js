export class AppManager {
  constructor({ bus, logger, storage, audio, presets, sequence, timer, ui }) {
    this.bus = bus;
    this.logger = logger;
    this.storage = storage;
    this.audio = audio;
    this.presets = presets;
    this.sequence = sequence;
    this.timer = timer;
    this.ui = ui;
    this.isRunningExtraTime = false;
    this.isInContinuousOverrun = false;
    this.lastExtraTimeDuration = 0;
  }

  init() {
    this.ui.init();
    this.sequence.init();
    this.timer.init();
    this.bindEvents();
    this.refreshUI();
  }

  bindEvents() {
    this.bus.on("ui:add-timer", ({ label, duration }) => {
      this.sequence.addTimer({ label, duration });
      this.refreshUI();
    });

    this.bus.on("ui:start", () => {
      const current = this.sequence.getCurrentTimer();
      const extraTimeRemaining = this.sequence.getExtraTimeRemaining();

      if (this.timer.isPaused()) {
        this.timer.resume();
        this.refreshUI();
        return;
      }

      if (this.timer.isRunning()) {
        this.refreshUI();
        return;
      }

      if (current && !this.isRunningExtraTime) {
        const duration =
          this.timer.getRemaining() > 0
            ? this.timer.getRemaining()
            : current.duration;

        this.timer.start(duration);
        this.refreshUI();
        return;
      }

      if (extraTimeRemaining > 0) {
        this.isRunningExtraTime = true;
        this.timer.start(extraTimeRemaining);
        this.refreshUI();
      }
    });

    this.bus.on("ui:pause", () => {
      this.timer.pause();
      this.refreshUI();
    });

    this.bus.on("ui:toggle-continuous", () => {
      this.sequence.setContinuousEnabled(!this.sequence.getContinuousEnabled());
      this.refreshUI();
    });

    this.bus.on("ui:reverse", () => {
      const timers = this.sequence.getAllTimers();
      if (!timers.length) return;

      if (this.isInContinuousOverrun) {
        if (!this.timer.isPaused()) return;

        this.isInContinuousOverrun = false;
        this.timer.stop();

        if (this.lastExtraTimeDuration > 0) {
          this.isRunningExtraTime = true;
          this.timer.reset(this.lastExtraTimeDuration);
          this.refreshUI();
          return;
        }

        const timers = this.sequence.getAllTimers();
        if (!timers.length) return;

        while (this.sequence.hasNext()) {
          this.sequence.advance();
        }

        const current = this.sequence.getCurrentTimer();
        if (current) {
          this.timer.reset(current.duration);
        }

        this.refreshUI();
        return;
      }

      // If we are in Extra Time, go back to the most recently skipped timer
      if (this.isRunningExtraTime) {
        const lastSkip = this.sequence.getLastSkip();
        if (!lastSkip) return;

        this.isRunningExtraTime = false;
        this.timer.stop();

        this.sequence.subtractExtraTime(lastSkip.extraSeconds);
        this.sequence.popLastSkip();

        while (this.sequence.getCurrentIndex() > lastSkip.timerIndex) {
          this.sequence.moveBack();
        }

        this.refreshUI();
        return;
      }

      const current = this.sequence.getCurrentTimer();
      if (!current) return;

      const remaining = this.timer.getRemaining();
      const currentIsInProgress =
        this.timer.isRunning() ||
        (this.timer.isPaused() &&
          remaining > 0 &&
          remaining < current.duration);

      // Case 1: current timer has actually started and is not at full time
      if (currentIsInProgress) {
        this.timer.reset(current.duration);
        this.refreshUI();
        return;
      }

      // Case 2: current timer is already at full duration, so go back if possible
      if (this.sequence.getCurrentIndex() === 0) {
        this.refreshUI();
        return;
      }

      const previousIndex = this.sequence.getCurrentIndex() - 1;
      const lastSkip = this.sequence.getLastSkip();

      this.sequence.moveBack();

      // If the timer we just moved back to was previously skipped,
      // undo that skipped extra time contribution
      if (lastSkip && lastSkip.timerIndex === previousIndex) {
        this.sequence.subtractExtraTime(lastSkip.extraSeconds);
        this.sequence.popLastSkip();
      }

      this.refreshUI();
    });

    this.bus.on("ui:skip", () => {
      const wasRunning = this.timer.isRunning();
      const wasPaused = this.timer.isPaused();

      if (this.isInContinuousOverrun) {
        if (!this.timer.isPaused()) return;

        this.isInContinuousOverrun = false;
        this.timer.stop();
        this.sequence.clearExtraTime();
        this.sequence.clearSkipHistory();
        this.sequence.resetSequencePosition();
        this.refreshUI();
        return;
      }

      if (this.isRunningExtraTime) {
        this.isRunningExtraTime = false;
        this.sequence.clearExtraTime();
        this.sequence.clearSkipHistory();
        this.timer.stop();
        this.sequence.resetSequencePosition();
        this.ui.setIdleDisplay();
        this.refreshUI();
        return;
      }

      const current = this.sequence.getCurrentTimer();
      if (!current) return;

      const currentIndex = this.sequence.getCurrentIndex();
      const remaining =
        this.timer.getRemaining() > 0
          ? this.timer.getRemaining()
          : current.duration;

      if (remaining > 0) {
        this.sequence.addExtraTime(remaining);
        this.sequence.recordSkip(currentIndex, remaining);
      }

      this.timer.stop();

      if (this.sequence.hasNext()) {
        this.isRunningExtraTime = false;
        this.sequence.advance();
        const next = this.sequence.getCurrentTimer();

        if (wasRunning && next) {
          this.timer.start(next.duration);
        } else if (wasPaused && next) {
          this.timer.reset(next.duration);
        }

        this.refreshUI();
        return;
      }

      const extraTimeRemaining = this.sequence.getExtraTimeRemaining();

      if (extraTimeRemaining > 0) {
        this.isRunningExtraTime = true;
        this.lastExtraTimeDuration = extraTimeRemaining;

        if (wasRunning) {
          this.timer.start(extraTimeRemaining);
        } else if (wasPaused) {
          this.timer.reset(extraTimeRemaining);
        }

        this.refreshUI();
        return;
      }

      this.isRunningExtraTime = false;
      this.sequence.resetSequencePosition();
      this.ui.setIdleDisplay();
      this.refreshUI();
    });

    this.bus.on("ui:start-over", () => {
      const timers = this.sequence.getAllTimers();
      if (!timers.length) return;

      this.isRunningExtraTime = false;
      this.timer.stop();
      this.sequence.clearExtraTime();
      this.sequence.clearSkipHistory();
      this.sequence.resetSequencePosition();
      this.isInContinuousOverrun = false;
      this.lastExtraTimeDuration = 0;
      this.refreshUI();
    });

    this.bus.on("ui:clear-all", () => {
      if (this.isTimerActive()) {
        const confirmed = window.confirm(
          "A timer is currently active. Clearing all will stop the current sequence. Continue?",
        );
        if (!confirmed) return;
      }

      this.isRunningExtraTime = false;
      this.timer.stop();
      this.sequence.clearExtraTime();
      this.sequence.clearSkipHistory();
      this.sequence.clearAll();
      this.ui.setIdleDisplay();
      this.isInContinuousOverrun = false;
      this.lastExtraTimeDuration = 0;
      this.refreshUI();
    });

    this.bus.on("ui:buzzer-toggle", (enabled) => {
      this.sequence.setBuzzerEnabled(enabled);
      this.refreshUI();
    });

    this.bus.on("ui:load-preset", (presetId) => {
      const preset = this.presets.getPresetById(presetId);
      if (!preset) return;

      if (this.isTimerActive()) {
        const confirmed = window.confirm(
          "A timer is currently active. Loading a preset will stop the current sequence. Continue?",
        );
        if (!confirmed) return;
      }

      this.isRunningExtraTime = false;
      this.timer.stop();
      this.sequence.clearExtraTime();
      this.sequence.clearSkipHistory();
      this.sequence.clearAll();
      this.sequence.addTimers(preset.timers);
      this.sequence.resetSequencePosition();
      this.bus.emit("menu:close");
      this.isInContinuousOverrun = false;
      this.lastExtraTimeDuration = 0;
      this.refreshUI();
    });

    this.bus.on("preset:save", (presetData) => {
      this.presets.savePreset(presetData);
      this.ui.renderPresets();
      this.refreshUI();
    });

    this.bus.on("preset:delete", (presetId) => {
      this.presets.deletePreset(presetId);
      this.ui.renderPresets();
      this.refreshUI();
    });

    this.bus.on("ui:queue-action", ({ action, id }) => {
      if (action === "remove") this.sequence.removeTimer(id);
      if (action === "up") this.sequence.moveUp(id);
      this.refreshUI();
    });

    this.bus.on("sequence:updated", () => {
      this.refreshUI();
    });

    this.bus.on("timer:tick", ({ remaining, progress }) => {
      const current = this.sequence.getCurrentTimer();

      this.ui.updateMainDisplay({
        label: this.isInContinuousOverrun
          ? "WRAP IT UP"
          : this.isRunningExtraTime
            ? "Extra Time"
            : current?.label || "No Timer Loaded",
        remaining,
        progress,
        index: this.sequence.getCurrentIndex(),
        total: this.sequence.getAllTimers().length,
      });

      this.ui.updateTotalTimeDisplay(
        this.getTotalRemaining(),
        this.sequence.getAllTimers().length > 0,
        this.sequence.getAllTimers().length,
      );

      this.ui.renderHeroQueue(
        this.sequence.getAllTimers(),
        this.sequence.getCurrentIndex(),
        this.getDisplayedExtraTimeRemaining(),
      );

      this.refreshUIControlsOnly();
    });

    this.bus.on("timer:completed", () => {
      this.timer.buzz(this.sequence.getBuzzerEnabled());

      if (this.isRunningExtraTime) {
        this.isRunningExtraTime = false;
        this.sequence.clearExtraTime();
        this.sequence.clearSkipHistory();

        if (this.sequence.getContinuousEnabled()) {
          this.isInContinuousOverrun = true;
          this.timer.startOverrun();
          this.refreshUI();
          return;
        }

        this.isInContinuousOverrun = false;
        this.timer.stop();
        this.sequence.resetSequencePosition();
        this.ui.setIdleDisplay();
        this.refreshUI();
        return;
      }

      if (this.sequence.hasNext()) {
        this.sequence.advance();
        const next = this.sequence.getCurrentTimer();
        this.isRunningExtraTime = false;
        this.timer.start(next.duration);
        this.refreshUI();
        return;
      }

      const extraTimeRemaining = this.sequence.getExtraTimeRemaining();

      if (extraTimeRemaining > 0) {
        this.isRunningExtraTime = true;
        this.lastExtraTimeDuration = extraTimeRemaining;
        this.timer.start(extraTimeRemaining);
        this.refreshUI();
        return;
      }

      if (this.sequence.getContinuousEnabled()) {
        this.isRunningExtraTime = false;
        this.isInContinuousOverrun = true;
        this.timer.startOverrun();
        this.refreshUI();
        return;
      }

      this.isRunningExtraTime = false;
      this.isInContinuousOverrun = false;
      this.timer.stop();
      this.sequence.resetSequencePosition();
      this.ui.setIdleDisplay();
      this.refreshUI();
    });

    this.bus.on("timer:stopped", () => {
      this.ui.setIdleDisplay();
      this.refreshUI();
    });

    this.bus.on("app:check-update", async () => {
      if (this.isTimerActive()) {
        alert(
          "Please stop or finish the current timer before checking for updates.",
        );
        return;
      }

      if (!("serviceWorker" in navigator)) return;

      this.ui.setCheckUpdateBusy(true);

      try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
          this.ui.setCheckUpdateBusy(false);
          this.ui.showNoUpdateAvailable();
          return;
        }

        await registration.update();

        window.setTimeout(() => {
          const hasUpdate = Boolean(registration.waiting);

          this.ui.setCheckUpdateBusy(false);

          if (hasUpdate) {
            this.ui.showUpdateAvailable(true);
          } else {
            this.ui.showUpdateAvailable(false);
            this.ui.showNoUpdateAvailable();
          }
        }, 1200);
      } catch (error) {
        console.error("Update check failed:", error);
        this.ui.setCheckUpdateBusy(false);
        this.ui.showNoUpdateAvailable();
      }
    });

    this.bus.on("app:apply-update", async () => {
      if (this.isTimerActive()) {
        alert("Please stop or finish the current timer before updating.");
        return;
      }

      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (!registration || !registration.waiting) {
          return;
        }

        window.location.reload();
      } catch (error) {
        console.error("Failed to apply update:", error);
      }
    });
  }

  /* HELPERS */

  getTotalRemaining() {
    const timers = this.sequence.getAllTimers();
    const currentIndex = this.sequence.getCurrentIndex();
    const current = this.sequence.getCurrentTimer();
    const extraTimeRemaining = this.sequence.getExtraTimeRemaining();

    if (this.isInContinuousOverrun) {
      return 0;
    }

    if (this.isRunningExtraTime) {
      return this.timer.getRemaining() > 0
        ? this.timer.getRemaining()
        : extraTimeRemaining;
    }

    if (!timers.length) {
      return extraTimeRemaining;
    }

    if (!current) {
      return extraTimeRemaining;
    }

    const currentRemaining =
      this.timer.getRemaining() > 0
        ? this.timer.getRemaining()
        : current.duration;

    const remainingAfterCurrent = timers
      .slice(currentIndex + 1)
      .reduce((sum, timer) => sum + (timer.duration || 0), 0);

    return currentRemaining + remainingAfterCurrent + extraTimeRemaining;
  }

  getDisplayedExtraTimeRemaining() {
    if (this.isRunningExtraTime) {
      return this.timer.getRemaining() > 0
        ? this.timer.getRemaining()
        : this.sequence.getExtraTimeRemaining();
    }

    return this.sequence.getExtraTimeRemaining();
  }

  refreshUIControlsOnly() {
    const hasTimers = !this.sequence.isEmpty();

    this.ui.updateControlState({
      hasTimers,
      isRunning: this.timer.isRunning(),
      isPaused: this.timer.isPaused(),
      isContinuousOverrunRunning:
        this.isInContinuousOverrun && this.timer.isRunning(),
      isContinuousOverrunPaused:
        this.isInContinuousOverrun && this.timer.isPaused(),
    });
  }

  isTimerActive() {
    const { timer } = this;
    return timer.isRunning() || timer.isPaused();
  }

  refreshUI() {
    const timers = this.sequence.getAllTimers();
    const currentIndex = this.sequence.getCurrentIndex();
    const current = this.sequence.getCurrentTimer();

    this.ui.renderPresets();
    this.ui.renderHeroQueue(
      timers,
      currentIndex,
      this.getDisplayedExtraTimeRemaining(),
    );
    this.ui.updateBuzzer(this.sequence.getBuzzerEnabled());

    const hasTimers = timers.length > 0;
    this.ui.updateControlState({
      hasTimers,
      isRunning: this.timer.isRunning(),
      isPaused: this.timer.isPaused(),
      isContinuousOverrunRunning:
        this.isInContinuousOverrun && this.timer.isRunning(),
      isContinuousOverrunPaused:
        this.isInContinuousOverrun && this.timer.isPaused(),
    });

    this.ui.updateContinuousButton(this.sequence.getContinuousEnabled());

    this.ui.updateTotalTimeDisplay(
      this.getTotalRemaining(),
      hasTimers,
      timers.length,
    );

    if (this.isInContinuousOverrun) {
      const overrunRemaining = -this.timer.getOverrunElapsed();

      this.ui.updateMainDisplay({
        label: "WRAP IT UP",
        remaining: overrunRemaining,
        progress: 0,
        index: timers.length,
        total: timers.length,
      });
      return;
    }

    if (!current && !this.isRunningExtraTime) {
      if (this.sequence.getExtraTimeRemaining() > 0) {
        this.ui.updateMainDisplay({
          label: "Extra Time",
          remaining:
            this.timer.getRemaining() > 0
              ? this.timer.getRemaining()
              : this.sequence.getExtraTimeRemaining(),
          progress: 100,
          index: timers.length,
          total: timers.length,
        });
        return;
      }

      this.ui.setIdleDisplay();
      return;
    }

    if (this.isRunningExtraTime) {
      const extraRemaining =
        this.timer.getRemaining() > 0
          ? this.timer.getRemaining()
          : this.sequence.getExtraTimeRemaining();

      const extraTotal =
        this.sequence.getExtraTimeRemaining() || extraRemaining;
      const progress = extraTotal > 0 ? (extraRemaining / extraTotal) * 100 : 0;

      this.ui.updateMainDisplay({
        label: "Extra Time",
        remaining: extraRemaining,
        progress,
        index: timers.length,
        total: timers.length,
      });
      return;
    }

    const remaining =
      this.timer.getRemaining() > 0
        ? this.timer.getRemaining()
        : current.duration;

    const duration = current.duration;
    const progress = duration > 0 ? (remaining / duration) * 100 : 0;

    this.ui.updateMainDisplay({
      label: current.label,
      remaining,
      progress,
      index: currentIndex,
      total: timers.length,
    });
  }
}
