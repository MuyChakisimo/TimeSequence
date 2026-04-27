export class PresetEditor {
  constructor() {
    this.elements = {
      modal: document.getElementById("presetEditorModal"),
      title: document.getElementById("presetEditorTitle"),
      closeButton: document.getElementById("closePresetEditorButton"),
      cancelButton: document.getElementById("cancelPresetEditorButton"),
      deleteButton: document.getElementById("deletePresetButton"),
      saveButton: document.getElementById("savePresetButton"),

      form: document.getElementById("presetEditorForm"),
      nameInput: document.getElementById("presetNameInput"),
      timersList: document.getElementById("presetTimersList"),
      addTimerRowButton: document.getElementById("addPresetTimerRowButton"),
    };

    this.currentPresetId = null;
  }

  open() {
    if (!this.elements.modal) return;

    this.elements.modal.classList.remove("hidden");
    this.elements.modal.setAttribute("aria-hidden", "false");

    if (this.elements.nameInput) {
      requestAnimationFrame(() => {
        this.elements.nameInput.focus();
      });
    }
  }

  close() {
    if (!this.elements.modal) return;

    // Move focus somewhere safe (like the + button)
    const safeFocusTarget = document.getElementById("addPresetButton");
    if (safeFocusTarget) {
      safeFocusTarget.focus();
    } else {
      document.body.focus();
    }

    this.elements.modal.classList.add("hidden");
    this.elements.modal.setAttribute("aria-hidden", "true");
  }

  isOpen() {
    if (!this.elements.modal) return false;
    return !this.elements.modal.classList.contains("hidden");
  }

  bindCloseEvents(onClose) {
    const { modal, closeButton, cancelButton } = this.elements;

    if (closeButton) {
      closeButton.addEventListener("click", onClose);
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", onClose);
    }

    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          onClose();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen()) {
        onClose();
      }
    });
  }

  setPreset(preset = null) {
    this.currentPresetId = preset?.id || null;

    if (this.elements.title) {
      this.elements.title.textContent = preset ? "Edit Preset" : "New Preset";
    }

    if (this.elements.nameInput) {
      this.elements.nameInput.value = preset?.name || "";
    }

    this.renderTimerRows(preset?.timers || []);
  }

  renderTimerRows(timers = []) {
    if (!this.elements.timersList) return;

    if (!timers.length) {
      this.elements.timersList.innerHTML = "";
      this.addTimerRow();
      return;
    }

    this.elements.timersList.innerHTML = timers
      .map((timer, index) => this.getTimerRowMarkup(timer, index))
      .join("");

    this.bindRowActions();
  }

  addTimerRow(timer = { label: "", duration: 0 }) {
    if (!this.elements.timersList) return;

    const index =
      this.elements.timersList.querySelectorAll(".preset-timer-row").length;
    this.elements.timersList.insertAdjacentHTML(
      "beforeend",
      this.getTimerRowMarkup(timer, index),
    );
    this.bindRowActions();
  }

  getTimerRowMarkup(timer, index) {
    const duration = Number(timer.duration || 0);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    return `
      <div class="preset-timer-row" data-row-index="${index}">
        <div class="preset-timer-row-top">
          <label class="preset-row-label preset-row-label-wide">
            Title
            <input
              type="text"
              class="preset-timer-title"
              value="${this.escape(timer.label || "")}"
              maxlength="40"
            />
          </label>

          <button
            type="button"
            class="preset-row-remove-button"
            aria-label="Remove timer row"
            title="Remove timer row"
          >
            ✕
          </button>
        </div>

        <div class="preset-row-time-grid">
          <label class="preset-row-label">
            H
            <input type="number" class="preset-timer-hours" min="0" max="23" value="${hours || ""}" />
          </label>

          <label class="preset-row-label">
            M
            <input type="number" class="preset-timer-minutes" min="0" max="59" value="${minutes || ""}" />
          </label>

          <label class="preset-row-label">
            S
            <input type="number" class="preset-timer-seconds" min="0" max="59" value="${seconds || ""}" />
          </label>
        </div>
      </div>
    `;
  }

  bindRowActions() {
    if (!this.elements.timersList) return;

    this.elements.timersList
      .querySelectorAll(".preset-row-remove-button")
      .forEach((button) => {
        button.onclick = () => {
          const row = button.closest(".preset-timer-row");
          if (!row) return;

          row.remove();

          const rows =
            this.elements.timersList.querySelectorAll(".preset-timer-row");
          if (!rows.length) {
            this.addTimerRow();
          }
        };
      });
  }

  bindEditorEvents({ onSave, onDelete, onAddRow }) {
    const { form, deleteButton, addTimerRowButton } = this.elements;

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        onSave(this.getFormData());
      });
    }

    if (deleteButton) {
      deleteButton.addEventListener("click", () => {
        if (!this.currentPresetId) return;
        onDelete(this.currentPresetId);
      });
    }

    if (addTimerRowButton) {
      addTimerRowButton.addEventListener("click", () => {
        this.addTimerRow();
        if (onAddRow) onAddRow();
      });
    }
  }

  getFormData() {
    const name = this.elements.nameInput?.value.trim() || "";

    const rows = Array.from(
      this.elements.timersList?.querySelectorAll(".preset-timer-row") || [],
    );

    const timers = rows
      .map((row) => {
        const label =
          row.querySelector(".preset-timer-title")?.value.trim() || "";
        const hours = Number(
          row.querySelector(".preset-timer-hours")?.value || 0,
        );
        const minutes = Number(
          row.querySelector(".preset-timer-minutes")?.value || 0,
        );
        const seconds = Number(
          row.querySelector(".preset-timer-seconds")?.value || 0,
        );
        const duration = hours * 3600 + minutes * 60 + seconds;

        return { label, duration };
      })
      .filter((timer) => timer.duration > 0);

    return {
      id: this.currentPresetId,
      name,
      timers,
    };
  }

  setDeleteEnabled(enabled) {
    if (!this.elements.deleteButton) return;
    this.elements.deleteButton.disabled = !enabled;
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }
}
