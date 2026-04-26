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
      sideMenu: document.getElementById("sideMenu"),

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

    if (el.menuButton) {
      el.menuButton.addEventListener("click", () => {
        el.sideMenu.classList.toggle("hidden");
      });
    }

    if (el.closeMenuButton) {
      el.closeMenuButton.addEventListener("click", () => {
        el.sideMenu.classList.add("hidden");
      });
    }

    if (el.addTimerButton) {
      el.addTimerButton.addEventListener("click", () => {
        if (el.sideMenu) {
          el.sideMenu.classList.add("hidden");
        }

        this.bus.emit("time-entry:open");
      });
    }

    if (el.timerForm) {
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
        this.bus.emit("time-entry:close");

        el.timerForm.reset();
        el.timerHours.value = 0;
        el.timerMinutes.value = 5;
        el.timerSeconds.value = 0;
      });
    }

    if (el.startButton) {
      el.startButton.addEventListener("click", () => {
        if (el.startButton.disabled) return;
        this.bus.emit("ui:start");
      });
    }

    if (el.pauseButton) {
      el.pauseButton.addEventListener("click", () => {
        if (el.pauseButton.disabled) return;
        this.bus.emit("ui:pause");
      });
    }

    if (el.resetButton) {
      el.resetButton.addEventListener("click", () => {
        if (el.resetButton.disabled) return;
        this.bus.emit("ui:reset");
      });
    }

    if (el.clearAllButton) {
      el.clearAllButton.addEventListener("click", () => {
        if (el.clearAllButton.disabled) return;

        const confirmed = window.confirm("Clear all timers?");
        if (!confirmed) return;

        this.bus.emit("ui:clear-all");
      });
    }

    if (el.buzzerToggle) {
      el.buzzerToggle.addEventListener("change", (event) => {
        this.bus.emit("ui:buzzer-toggle", event.target.checked);
      });
    }
  }

  renderPresets() {
    if (!this.elements.presetList) return;

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
    if (!this.elements.timerQueue) return;

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
    if (this.elements.currentLabel) {
      this.elements.currentLabel.textContent = label || "No Timer Loaded";
    }

    if (this.elements.mainTimer) {
      this.elements.mainTimer.textContent = formatSecondsToClock(
        remaining ?? 0,
      );
    }

    if (this.elements.subStatus) {
      this.elements.subStatus.textContent =
        total > 0
          ? `Timer ${index + 1} of ${total}`
          : "Add a timer with the + button";
    }

    if (this.elements.progressBar) {
      this.elements.progressBar.style.width = `${Math.max(
        0,
        Math.min(100, progress || 0),
      )}%`;
    }
  }

  updateBuzzer(enabled) {
    if (this.elements.buzzerToggle) {
      this.elements.buzzerToggle.checked = enabled;
    }
  }

  updateControlState({ hasTimers, isRunning, isPaused }) {
    const { startButton, pauseButton, resetButton, clearAllButton } =
      this.elements;

    if (startButton) {
      startButton.disabled = !hasTimers || isRunning;
      startButton.setAttribute("aria-disabled", String(startButton.disabled));
      startButton.classList.toggle("is-disabled", startButton.disabled);
      startButton.classList.toggle("is-active", isRunning);
    }

    if (pauseButton) {
      pauseButton.disabled = !hasTimers || !isRunning;
      pauseButton.setAttribute("aria-disabled", String(pauseButton.disabled));
      pauseButton.classList.toggle("is-disabled", pauseButton.disabled);
      pauseButton.classList.toggle("is-active", isPaused);
    }

    if (resetButton) {
      resetButton.disabled = !hasTimers || (!isRunning && !isPaused);
      resetButton.setAttribute("aria-disabled", String(resetButton.disabled));
      resetButton.classList.toggle("is-disabled", resetButton.disabled);
    }

    if (clearAllButton) {
      clearAllButton.disabled = !hasTimers;
      clearAllButton.setAttribute(
        "aria-disabled",
        String(clearAllButton.disabled),
      );
      clearAllButton.classList.toggle("is-disabled", clearAllButton.disabled);
    }
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
