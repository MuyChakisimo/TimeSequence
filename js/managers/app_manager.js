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

    this.bus.on("ui:skip", () => {
      if (this.isRunningExtraTime) {
        this.isRunningExtraTime = false;
        this.sequence.clearExtraTime();
        this.timer.stop();
        this.sequence.resetSequencePosition();
        this.ui.setIdleDisplay();
        this.refreshUI();
        return;
      }

      const current = this.sequence.getCurrentTimer();
      if (!current) return;

      const remaining =
        this.timer.getRemaining() > 0
          ? this.timer.getRemaining()
          : current.duration;

      if (remaining > 0) {
        this.sequence.addExtraTime(remaining);
      }

      this.timer.stop();

      if (this.sequence.hasNext()) {
        this.isRunningExtraTime = false;
        this.sequence.advance();
        const next = this.sequence.getCurrentTimer();
        this.timer.start(next.duration);
        this.refreshUI();
        return;
      }

      const extraTimeRemaining = this.sequence.getExtraTimeRemaining();

      if (extraTimeRemaining > 0) {
        this.isRunningExtraTime = true;
        this.timer.start(extraTimeRemaining);
        this.refreshUI();
        return;
      }

      this.isRunningExtraTime = false;
      this.sequence.resetSequencePosition();
      this.ui.setIdleDisplay();
      this.refreshUI();
    });

    this.bus.on("ui:reset", () => {
      const current = this.sequence.getCurrentTimer();
      if (!current) return;

      this.timer.reset(current.duration);
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
      this.sequence.clearAll();
      this.ui.setIdleDisplay();
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
      this.sequence.clearAll();
      this.sequence.addTimers(preset.timers);
      this.sequence.resetSequencePosition();

      this.bus.emit("menu:close");
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
        label: this.isRunningExtraTime
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
        this.timer.start(extraTimeRemaining);
        this.refreshUI();
        return;
      }

      this.isRunningExtraTime = false;
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
    });

    this.ui.updateTotalTimeDisplay(
      this.getTotalRemaining(),
      hasTimers,
      timers.length,
    );

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
