export class TimeEntry {
  constructor() {
    this.elements = {
      modal: document.getElementById("timeEntryModal"),
      closeButton: document.getElementById("closeTimeEntryButton"),
      cancelButton: document.getElementById("cancelTimeEntryButton"),
      firstInput: document.getElementById("timerLabel"),
    };
  }

  open() {
    if (!this.elements.modal) return;

    this.elements.modal.classList.remove("hidden");
    this.elements.modal.setAttribute("aria-hidden", "false");

    if (this.elements.firstInput) {
      requestAnimationFrame(() => {
        this.elements.firstInput.focus();
      });
    }
  }

  close() {
    if (!this.elements.modal) return;

    // Move focus somewhere visible BEFORE hiding
    const safeFocusTarget = document.getElementById("addTimerButton");

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
}
