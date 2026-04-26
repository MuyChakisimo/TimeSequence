import { formatSecondsToClock, normalizeDuration } from "../core/time.js";

export class UIManager {
  constructor(bus, presets, logger) {
    this.bus = bus;
    this.presets = presets;
    this.logger = logger;
  }

  init() {
    this.cache();
    this.bindUI();
    this.renderPresets();
  }

  cache() {
    this.elements = {
      menuButton: document.getElementById("menuButton"),
      addTimerButton: document.getElementById("addTimerButton"),
      closeMenuButton: document.getElementById("closeMenuButton"),
      closeAddPanelButton: document.getElementById("closeAddPanelButton"),
      sideMenu: document.getElementById("sideMenu"),
      addPanel: document.getElementById("addPanel"),

      startButton: document.getElementById("startButton"),
      pauseButton: document.getElementById("pauseButton"),
      resetButton: document.getElementById("resetButton"),
      clearAllButton: document.getElementById("clearAllButton"),

      mainTimer: document.getElementById("mainTimer"),
      currentLabel: document.getElementById("currentLabel"),
      subStatus: document.getElementById("subStatus"),
      progressBar: document.getElementById("progressBar"),

      timerForm: document.getElementById("timerForm"),
      timerLabel: document.getElementById("timerLabel"),
      timerHours: document.getElementById("timerHours"),
      timerMinutes: document.getElementById("timerMinutes"),
      timerSeconds: document.getElementById("timerSeconds"),

      buzzerToggle: document.getElementById("buzzerToggle"),
      timerQueue: document.getElementById("timerQueue"),
      presetList: document.getElementById("presetList"),
      heroQueue: document.getElementById("heroQueue"),
    };
  }

  bindUI() {
    const el = this.elements;

    el.menuButton.addEventListener("click", () => {
      el.sideMenu.classList.toggle("hidden");
      el.addPanel.classList.add("hidden");
    });

    el.closeMenuButton.addEventListener("click", () => {
      el.sideMenu.classList.add("hidden");
    });

    el.addTimerButton.addEventListener("click", () => {
      el.addPanel.classList.toggle("hidden");
      el.sideMenu.classList.add("hidden");
    });

    el.closeAddPanelButton.addEventListener("click", () => {
      el.addPanel.classList.add("hidden");
    });

    el.timerForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const label = el.timerLabel.value.trim();
      const duration = normalizeDuration(
        el.timerHours.value,
        el.timerMinutes.value,
        el.timerSeconds.value,
      );

      if (duration <= 0) {
        alert("Please enter a time greater than 0.");
        return;
      }

      this.bus.emit("ui:add-timer", { label, duration });

      el.timerForm.reset();
      el.timerHours.value = 0;
      el.timerMinutes.value = 5;
      el.timerSeconds.value = 0;
    });

    el.startButton.addEventListener("click", () => {
      if (el.startButton.disabled) return;
      this.bus.emit("ui:start");
    });

    el.pauseButton.addEventListener("click", () => {
      if (el.pauseButton.disabled) return;
      this.bus.emit("ui:pause");
    });

    el.resetButton.addEventListener("click", () => {
      if (el.resetButton.disabled) return;
      this.bus.emit("ui:reset");
    });

    el.clearAllButton.addEventListener("click", () => {
      if (el.clearAllButton.disabled) return;

      const confirmed = window.confirm("Clear all timers?");
      if (!confirmed) return;

      this.bus.emit("ui:clear-all");
    });

    el.buzzerToggle.addEventListener("change", (event) => {
      this.bus.emit("ui:buzzer-toggle", event.target.checked);
    });
  }

  renderPresets() {
    const presets = this.presets.getPresets();

    this.elements.presetList.innerHTML = presets
      .map(
        (preset) => `
          <div class="preset-item">
            <div class="queue-title">${preset.name}</div>
            <div class="queue-time">${preset.timers.length} timer(s)</div>
            <div class="preset-actions">
              <button data-preset-id="${preset.id}">Load</button>
            </div>
          </div>
        `,
      )
      .join("");

    this.elements.presetList
      .querySelectorAll("button[data-preset-id]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.bus.emit("ui:load-preset", button.dataset.presetId);
        });
      });
  }

  renderQueue(timers, currentIndex) {
    if (!timers.length) {
      this.elements.timerQueue.innerHTML = `<div class="queue-item">No timers yet.</div>`;
      return;
    }

    this.elements.timerQueue.innerHTML = timers
      .map(
        (timer, index) => `
          <div class="queue-item">
            <div class="queue-item-top">
              <div>
                <div class="queue-title">
                  ${index === currentIndex ? "▶ " : ""}${this.escape(timer.label)}
                </div>
                <div class="queue-time">${formatSecondsToClock(timer.duration)}</div>
              </div>
            </div>
            <div class="queue-actions">
              <button data-action="up" data-id="${timer.id}">Up</button>
              <button data-action="remove" data-id="${timer.id}">Remove</button>
            </div>
          </div>
        `,
      )
      .join("");

    this.elements.timerQueue
      .querySelectorAll("button[data-action]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.bus.emit("ui:queue-action", {
            action: button.dataset.action,
            id: button.dataset.id,
          });
        });
      });
  }

  renderHeroQueue(timers, currentIndex) {
    if (!this.elements.heroQueue) return;

    if (!timers.length) {
      this.elements.heroQueue.innerHTML = `
        <div class="hero-timer-chip">
          <div class="hero-chip-index">Sequence</div>
          <div class="hero-chip-label">No timers added</div>
          <div class="hero-chip-time">Use the + button to build a sequence</div>
        </div>
      `;
      return;
    }

    this.elements.heroQueue.innerHTML = timers
      .map(
        (timer, index) => `
          <div class="hero-timer-chip ${index === currentIndex ? "active" : ""}">
            <div class="hero-chip-index">Timer ${index + 1}</div>
            <div class="hero-chip-label">${this.escape(timer.label)}</div>
            <div class="hero-chip-time">${formatSecondsToClock(timer.duration)}</div>
          </div>
        `,
      )
      .join("");
  }

  updateMainDisplay({ label, remaining, progress, index, total }) {
    this.elements.currentLabel.textContent = label || "No Timer Loaded";
    this.elements.mainTimer.textContent = formatSecondsToClock(remaining ?? 0);
    this.elements.subStatus.textContent =
      total > 0
        ? `Timer ${index + 1} of ${total}`
        : "Add a timer with the + button";
    this.elements.progressBar.style.width = `${Math.max(
      0,
      Math.min(100, progress || 0),
    )}%`;
  }

  updateBuzzer(enabled) {
    this.elements.buzzerToggle.checked = enabled;
  }

  updateControlState({ hasTimers, isRunning, isPaused }) {
    const { startButton, pauseButton, resetButton, clearAllButton } =
      this.elements;

    startButton.disabled = !hasTimers || isRunning;
    pauseButton.disabled = !hasTimers || !isRunning;
    resetButton.disabled = !hasTimers || (!isRunning && !isPaused);
    clearAllButton.disabled = !hasTimers;

    startButton.setAttribute("aria-disabled", String(startButton.disabled));
    pauseButton.setAttribute("aria-disabled", String(pauseButton.disabled));
    resetButton.setAttribute("aria-disabled", String(resetButton.disabled));
    clearAllButton.setAttribute(
      "aria-disabled",
      String(clearAllButton.disabled),
    );

    startButton.classList.toggle("is-disabled", startButton.disabled);
    pauseButton.classList.toggle("is-disabled", pauseButton.disabled);
    resetButton.classList.toggle("is-disabled", resetButton.disabled);
    clearAllButton.classList.toggle("is-disabled", clearAllButton.disabled);

    startButton.classList.toggle("is-active", isRunning);
    pauseButton.classList.toggle("is-active", isPaused);
  }

  setIdleDisplay() {
    this.updateMainDisplay({
      label: "No Timer Loaded",
      remaining: 0,
      progress: 0,
      index: 0,
      total: 0,
    });

    if (this.elements.heroQueue) {
      this.renderHeroQueue([], 0);
    }
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }
}
