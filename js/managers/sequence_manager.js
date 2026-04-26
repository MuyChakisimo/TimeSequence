export class SequenceManager {
  constructor(bus, storage, logger) {
    this.bus = bus;
    this.storage = storage;
    this.logger = logger;

    this.state = {
      timers: [],
      currentIndex: 0,
      buzzerEnabled: true,
    };
  }

  init() {
    const saved = this.storage.load();
    if (saved) {
      this.state = { ...this.state, ...saved };
      this.logger.info("Loaded saved sequence", this.state);
    }
    this.emitUpdate();
  }

  addTimer(timer) {
    this.state.timers.push({
      id: crypto.randomUUID(),
      label: timer.label || `Timer ${this.state.timers.length + 1}`,
      duration: timer.duration,
    });
    this.persist();
  }

  addTimers(timers) {
    timers.forEach((timer) => this.addTimer(timer));
  }

  removeTimer(id) {
    this.state.timers = this.state.timers.filter((timer) => timer.id !== id);
    this.state.currentIndex = Math.min(
      this.state.currentIndex,
      Math.max(0, this.state.timers.length - 1),
    );
    this.persist();
  }

  moveUp(id) {
    const index = this.state.timers.findIndex((timer) => timer.id === id);
    if (index <= 0) return;
    [this.state.timers[index - 1], this.state.timers[index]] = [
      this.state.timers[index],
      this.state.timers[index - 1],
    ];
    this.persist();
  }

  clearAll() {
    this.state.timers = [];
    this.state.currentIndex = 0;
    this.persist();
  }

  resetSequencePosition() {
    this.state.currentIndex = 0;
    this.persist(false);
    this.emitUpdate();
  }

  setBuzzerEnabled(enabled) {
    this.state.buzzerEnabled = Boolean(enabled);
    this.persist();
  }

  getCurrentTimer() {
    return this.state.timers[this.state.currentIndex] || null;
  }

  getAllTimers() {
    return [...this.state.timers];
  }

  getCurrentIndex() {
    return this.state.currentIndex;
  }

  getBuzzerEnabled() {
    return this.state.buzzerEnabled;
  }

  advance() {
    this.state.currentIndex += 1;
    this.persist(false);
    this.emitUpdate();
  }

  hasNext() {
    return this.state.currentIndex < this.state.timers.length - 1;
  }

  isEmpty() {
    return this.state.timers.length === 0;
  }

  toJSON() {
    return {
      timers: this.state.timers,
      currentIndex: this.state.currentIndex,
      buzzerEnabled: this.state.buzzerEnabled,
    };
  }

  persist(emit = true) {
    this.storage.save(this.toJSON());
    if (emit) this.emitUpdate();
  }

  emitUpdate() {
    this.bus.emit("sequence:updated", this.toJSON());
  }
}
