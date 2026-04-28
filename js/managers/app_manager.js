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
      if (!current) return;

      if (this.timer.isPaused()) {
        this.timer.resume();
      } else if (!this.timer.isRunning()) {
        this.timer.start(current.duration);
      }

      this.refreshUI();
    });

    this.bus.on("ui:pause", () => {
      this.timer.pause();
      this.refreshUI();
    });

    this.bus.on("ui:reset", () => {
      const current = this.sequence.getCurrentTimer();
      if (!current) return;

      this.timer.reset(current.duration);
      this.refreshUI();
    });

    this.bus.on("ui:clear-all", () => {
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

    this.bus.on("timer:tick", ({ remaining, duration, progress }) => {
      const current = this.sequence.getCurrentTimer();

      this.ui.updateMainDisplay({
        label: current?.label || "No Timer Loaded",
        remaining,
        progress,
        index: this.sequence.getCurrentIndex(),
        total: this.sequence.getAllTimers().length,
      });

      this.refreshUIControlsOnly();
    });

    this.bus.on("timer:completed", () => {
      this.timer.buzz(this.sequence.getBuzzerEnabled());

      if (this.sequence.hasNext()) {
        this.sequence.advance();
        const next = this.sequence.getCurrentTimer();
        this.timer.start(next.duration);
        this.refreshUI();
        return;
      }

      this.timer.stop();
      this.sequence.resetSequencePosition();
      this.ui.setIdleDisplay();
      this.refreshUI();
    });

    this.bus.on("timer:stopped", () => {
      this.ui.setIdleDisplay();
      this.refreshUI();
    });
  }

  refreshUIControlsOnly() {
    const hasTimers = !this.sequence.isEmpty();

    this.ui.updateControlState({
      hasTimers,
      isRunning: this.timer.isRunning(),
      isPaused: this.timer.isPaused(),
    });
  }

  refreshUI() {
    const timers = this.sequence.getAllTimers();
    const currentIndex = this.sequence.getCurrentIndex();
    const current = this.sequence.getCurrentTimer();

    this.ui.renderPresets();
    this.ui.renderHeroQueue(timers, currentIndex);
    this.ui.updateBuzzer(this.sequence.getBuzzerEnabled());

    const hasTimers = timers.length > 0;
    this.ui.updateControlState({
      hasTimers,
      isRunning: this.timer.isRunning(),
      isPaused: this.timer.isPaused(),
    });

    if (!current) {
      this.ui.setIdleDisplay();
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
