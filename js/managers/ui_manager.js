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
    this.fitTimerText();
  }

  cache() {
    this.elements = {
      menuButton: document.getElementById("menuButton"),
      addTimerButton: document.getElementById("addTimerButton"),
      addPresetButton: document.getElementById("addPresetButton"),
      closeMenuButton: document.getElementById("closeMenuButton"),
      sideMenu: document.getElementById("sideMenu"),
      menuBackdrop: document.getElementById("menuBackdrop"),
      updateAppButton: document.getElementById("updateAppButton"),
      checkUpdateButton: document.getElementById("checkUpdateButton"),

      startButton: document.getElementById("startButton"),
      pauseButton: document.getElementById("pauseButton"),
      skipButton: document.getElementById("skipButton"),
      resetButton: document.getElementById("resetButton"),
      clearAllButton: document.getElementById("clearAllButton"),

      mainTimer: document.getElementById("mainTimer"),
      currentLabel: document.getElementById("currentLabel"),
      subStatus: document.getElementById("subStatus"),
      progressBar: document.getElementById("progressBar"),
      progressRow: document.getElementById("progressRow"),
      totalTimeDisplay: document.getElementById("totalTimeDisplay"),

      timerForm: document.getElementById("timerForm"),
      timerLabel: document.getElementById("timerLabel"),
      clearLabelButton: document.getElementById("clearLabelButton"),
      timerHours: document.getElementById("timerHours"),
      timerMinutes: document.getElementById("timerMinutes"),
      timerSeconds: document.getElementById("timerSeconds"),

      buzzerToggle: document.getElementById("buzzerToggle"),
      presetList: document.getElementById("presetList"),
      heroQueue: document.getElementById("heroQueue"),

      timePresetButtons: document.querySelectorAll(".time-preset-button"),
    };
  }

  bindUI() {
    const el = this.elements;
    const clearBtn = el.clearLabelButton;

    if (clearBtn && el.timerLabel) {
      clearBtn.addEventListener("click", () => {
        el.timerLabel.value = "";
        el.timerLabel.focus();
      });
    }

    if (clearBtn && el.timerLabel) {
      const toggleClear = () => {
        clearBtn.style.opacity = el.timerLabel.value ? "1" : "0.3";
      };

      el.timerLabel.addEventListener("input", toggleClear);
      toggleClear();
    }

    if (el.menuButton) {
      el.menuButton.addEventListener("click", () => {
        if (el.sideMenu) {
          const willOpen = el.sideMenu.classList.contains("hidden");

          el.sideMenu.classList.toggle("hidden");

          if (el.menuBackdrop) {
            el.menuBackdrop.classList.toggle("hidden", !willOpen);
          }
        }
      });
    }

    if (el.closeMenuButton) {
      el.closeMenuButton.addEventListener("click", () => {
        if (el.sideMenu) {
          el.sideMenu.classList.add("hidden");
        }

        if (el.menuBackdrop) {
          el.menuBackdrop.classList.add("hidden");
        }
      });
    }

    if (el.menuBackdrop) {
      el.menuBackdrop.addEventListener("click", () => {
        if (el.sideMenu) {
          el.sideMenu.classList.add("hidden");
        }

        el.menuBackdrop.classList.add("hidden");
      });
    }

    if (el.updateAppButton) {
      el.updateAppButton.addEventListener("click", () => {
        window.location.reload();
      });
    }

    if (el.checkUpdateButton) {
      el.checkUpdateButton.addEventListener("click", () => {
        this.bus.emit("app:check-update");
      });
    }

    if (el.updateAppButton) {
      el.updateAppButton.addEventListener("click", () => {
        this.bus.emit("app:apply-update");
      });
    }

    if (el.addTimerButton) {
      el.addTimerButton.addEventListener("click", () => {
        if (el.sideMenu) {
          el.sideMenu.classList.add("hidden");
        }

        if (el.menuBackdrop) {
          el.menuBackdrop.classList.add("hidden");
        }

        this.bus.emit("time-entry:open");
      });
    }

    if (el.addPresetButton) {
      el.addPresetButton.addEventListener("click", () => {
        this.bus.emit("preset-editor:open-new");
      });
    }

    if (el.timerForm) {
      el.timerForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const label = el.timerLabel.value.trim();
        const duration = normalizeDuration(
          el.timerHours.value || 0,
          el.timerMinutes.value || 0,
          el.timerSeconds.value || 0,
        );

        if (duration <= 0) {
          alert("Please enter a time greater than 0.");
          return;
        }

        this.bus.emit("ui:add-timer", { label, duration });
        this.bus.emit("time-entry:close");

        el.timerForm.reset();
        el.timerHours.value = "";
        el.timerMinutes.value = "";
        el.timerSeconds.value = "";
      });
    }

    if (el.timePresetButtons && el.timePresetButtons.length > 0) {
      el.timePresetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const totalSeconds = Number(button.dataset.presetSeconds || 0);

          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          el.timerHours.value = hours > 0 ? String(hours) : "";
          el.timerMinutes.value = minutes > 0 ? String(minutes) : "";
          el.timerSeconds.value = seconds > 0 ? String(seconds) : "";
        });
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

    if (el.skipButton) {
      el.skipButton.addEventListener("click", () => {
        if (el.skipButton.disabled) return;
        this.bus.emit("ui:skip");
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

    this.bus.on("menu:close", () => {
      if (el.sideMenu) {
        el.sideMenu.classList.add("hidden");
      }

      if (el.menuBackdrop) {
        el.menuBackdrop.classList.add("hidden");
      }
    });

    window.addEventListener("resize", () => {
      this.fitTimerText();
    });
  }

  /* HELPERS */

  getTotalDuration(timers = []) {
    return timers.reduce((sum, timer) => sum + (timer.duration || 0), 0);
  }

  getPresetDisplayName(preset, index) {
    const name = preset?.name?.trim();
    return name || `Preset ${index + 1}`;
  }

  renderPresets() {
    if (!this.elements.presetList) return;

    const presets = this.presets.getPresets();

    this.elements.presetList.innerHTML = presets
      .map((preset, index) => {
        const totalDuration = this.getTotalDuration(preset.timers || []);
        const presetName = this.getPresetDisplayName(preset, index);

        return `
          <div class="preset-item">
            <div class="queue-item-top">
              <div>
                <div class="queue-title">${this.escape(presetName)}</div>
                <div class="queue-time">
                  ${(preset.timers || []).length} timer(s) • ${formatSecondsToClock(totalDuration)}
                </div>
              </div>
              <button
                type="button"
                class="preset-edit-button"
                data-edit-preset-id="${preset.id}"
                aria-label="Edit ${this.escape(presetName)}"
                title="Edit ${this.escape(presetName)}"
              >
                ✎
              </button>
            </div>

            <div class="preset-actions">
              <button data-preset-id="${preset.id}">Load</button>
            </div>
          </div>
        `;
      })
      .join("");

    this.elements.presetList
      .querySelectorAll("button[data-preset-id]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.bus.emit("ui:load-preset", button.dataset.presetId);
        });
      });

    this.elements.presetList
      .querySelectorAll("button[data-edit-preset-id]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.bus.emit("ui:edit-preset", button.dataset.editPresetId);
        });
      });
  }

  renderHeroQueue(timers, currentIndex, extraTimeRemaining = 0) {
    if (!this.elements.heroQueue) return;

    if (!timers.length) {
      this.elements.heroQueue.innerHTML = `
        <div class="hero-timer-chip placeholder">
          <div class="hero-chip-index">Sequence</div>
          <div class="hero-chip-label">No timers added</div>
        </div>
      `;
      return;
    }

    const totalDuration = this.getTotalDuration(timers);

    const timerChips = timers
      .map((timer, index) => {
        let stateClass = "";

        if (index < currentIndex) {
          stateClass = "completed";
        } else if (index === currentIndex) {
          stateClass = "active";
        }

        return `
          <div class="hero-timer-chip ${stateClass}">
            <div class="hero-chip-index">Timer ${index + 1}</div>
            <div class="hero-chip-label">${this.escape(timer.label)}</div>
            <div class="hero-chip-time">${formatSecondsToClock(timer.duration)}</div>
          </div>
        `;
      })
      .join("");

    const totalChip = `
  <div class="hero-timer-chip total-chip">
    <div class="hero-chip-index">Total</div>
    <div class="hero-chip-label">${timers.length} timer(s)</div>
    <div class="hero-chip-time">${formatSecondsToClock(totalDuration)}</div>
  </div>
`;

    const extraChip =
      extraTimeRemaining > 0
        ? `
      <div class="hero-timer-chip extra-chip">
        <div class="hero-chip-index">Extra</div>
        <div class="hero-chip-label">Skipped time</div>
        <div class="hero-chip-time">${formatSecondsToClock(extraTimeRemaining)}</div>
      </div>
    `
        : "";

    this.elements.heroQueue.innerHTML = timerChips + totalChip + extraChip;
  }

  updateTotalTimeDisplay(totalRemaining, show = true, timerCount = 0) {
    if (!this.elements.totalTimeDisplay || !this.elements.progressRow) return;

    const shouldShow = show && timerCount > 1;

    this.elements.totalTimeDisplay.textContent = formatSecondsToClock(
      totalRemaining ?? 0,
    );

    this.elements.totalTimeDisplay.classList.toggle("hidden", !shouldShow);

    this.elements.progressRow.classList.toggle("single-timer", !shouldShow);
    this.elements.progressRow.classList.toggle("has-total-time", shouldShow);
  }

  updateMainDisplay({ label, remaining, progress, index, total }) {
    if (this.elements.currentLabel) {
      this.elements.currentLabel.textContent = label || "No Timer Loaded";
    }

    if (this.elements.mainTimer) {
      const time = formatSecondsToClock(remaining ?? 0);
      const displayTime =
        label === "Extra Time"
          ? `<span class="extra-plus">+</span>${time}`
          : time;

      this.elements.mainTimer.innerHTML = displayTime.replace(
        /:/g,
        "<span class='colon'>:</span>",
      );

      this.fitTimerText();
    }

    if (this.elements.subStatus) {
      this.elements.subStatus.textContent =
        total > 0
          ? `Timer ${index + 1} of ${total}`
          : "Add a timer with the + button";
    }

    if (this.elements.progressBar || this.elements.mainTimer) {
      const safeProgress = Math.max(0, Math.min(100, progress || 0));

      if (this.elements.progressBar) {
        this.elements.progressBar.style.width = `${safeProgress}%`;
      }

      let progressColor = "#39ff14"; // green

      if (safeProgress <= 10) {
        progressColor = "#ff4d4d"; // red
      } else if (safeProgress <= 30) {
        progressColor = "#ffd60a"; // yellow
      } else if (safeProgress <= 50) {
        progressColor = "#4da6ff"; // blue
      }

      if (this.elements.progressBar) {
        this.elements.progressBar.style.background = progressColor;
      }

      if (this.elements.mainTimer) {
        this.elements.mainTimer.style.color = progressColor;

        this.elements.mainTimer.style.textShadow = `
        0 0 6px ${progressColor}55,
        0 0 14px ${progressColor}33
        `;
      }
    }
  }

  updateBuzzer(enabled) {
    if (this.elements.buzzerToggle) {
      this.elements.buzzerToggle.checked = enabled;
    }
  }

  showUpdateAvailable(show = true) {
    if (!this.elements.updateAppButton) return;

    this.elements.updateAppButton.classList.toggle("hidden", !show);
  }

  updateControlState({ hasTimers, isRunning, isPaused }) {
    const {
      startButton,
      pauseButton,
      skipButton,
      resetButton,
      clearAllButton,
    } = this.elements;

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

    if (skipButton) {
      skipButton.disabled = !hasTimers || (!isRunning && !isPaused);
      skipButton.setAttribute("aria-disabled", String(skipButton.disabled));
      skipButton.classList.toggle("is-disabled", skipButton.disabled);
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

    this.updateTotalTimeDisplay(0, false, 0);

    if (this.elements.heroQueue) {
      this.renderHeroQueue([], 0);
    }
  }

  fitTimerText() {
    const timerEl = this.elements.mainTimer;
    const stageEl =
      timerEl?.closest(".timer-stage-large") ||
      timerEl?.closest(".timer-stage");

    if (!timerEl || !stageEl) return;

    const stageWidth = stageEl.clientWidth;
    const stageHeight = stageEl.clientHeight;

    if (!stageWidth || !stageHeight) return;

    const isTinyScreen = window.innerWidth <= 380;

    const maxWidth = stageWidth * (isTinyScreen ? 0.94 : 0.98);
    const maxHeight = stageHeight * (isTinyScreen ? 0.68 : 0.72);

    let low = isTinyScreen ? 14 : 20;
    let high = 600;
    let best = isTinyScreen ? 14 : 20;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      timerEl.style.fontSize = `${mid}px`;

      const fitsWidth = timerEl.scrollWidth <= maxWidth;
      const fitsHeight = timerEl.scrollHeight <= maxHeight;

      if (fitsWidth && fitsHeight) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    timerEl.style.fontSize = `${best}px`;
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  showUpdateAvailable(show = true) {
    if (!this.elements.updateAppButton) return;
    this.elements.updateAppButton.classList.toggle("hidden", !show);
  }

  setCheckUpdateBusy(isBusy) {
    if (!this.elements.checkUpdateButton) return;

    this.elements.checkUpdateButton.disabled = isBusy;
    this.elements.checkUpdateButton.classList.toggle("is-disabled", isBusy);
    this.elements.checkUpdateButton.textContent = isBusy
      ? "Checking..."
      : "Check for Updates";

    this.elements.checkUpdateButton.classList.remove("is-no-update");
  }

  showNoUpdateAvailable() {
    if (!this.elements.checkUpdateButton) return;

    const button = this.elements.checkUpdateButton;

    button.disabled = true;
    button.classList.remove("is-disabled");
    button.classList.add("is-no-update");
    button.textContent = "No Update Available";

    window.setTimeout(() => {
      button.disabled = false;
      button.classList.remove("is-no-update");
      button.textContent = "Check for Updates";
    }, 1500);
  }
}
