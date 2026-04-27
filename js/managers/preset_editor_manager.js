export class PresetEditorManager {
  constructor(bus, presetEditor, presets, logger) {
    this.bus = bus;
    this.presetEditor = presetEditor;
    this.presets = presets;
    this.logger = logger;
  }

  init() {
    this.presetEditor.bindCloseEvents(() => {
      this.close();
    });

    this.presetEditor.bindEditorEvents({
      onSave: (data) => this.savePreset(data),
      onDelete: (presetId) => this.deletePreset(presetId),
      onAddRow: () => {
        this.logger.info("Preset timer row added");
      },
    });

    this.bus.on("preset-editor:open-new", () => {
      this.openNew();
    });

    this.bus.on("ui:edit-preset", (presetId) => {
      this.openExisting(presetId);
    });

    this.bus.on("preset-editor:close", () => {
      this.close();
    });
  }

  openNew() {
    this.presetEditor.setPreset(null);
    this.presetEditor.setDeleteEnabled(false);
    this.presetEditor.open();
    this.logger.info("Preset editor opened for new preset");
  }

  openExisting(presetId) {
    const preset = this.presets
      .getPresets()
      .find((item) => item.id === presetId);
    if (!preset) return;

    this.presetEditor.setPreset(preset);
    this.presetEditor.setDeleteEnabled(true);
    this.presetEditor.open();
    this.logger.info("Preset editor opened", { presetId });
  }

  close() {
    this.presetEditor.close();
    this.logger.info("Preset editor closed");
  }

  savePreset(data) {
    if (!data.timers.length) {
      alert("Please add at least one timer to the preset.");
      return;
    }

    this.bus.emit("preset:save", data);
    this.close();
  }

  deletePreset(presetId) {
    const confirmed = window.confirm("Delete this preset?");
    if (!confirmed) return;

    this.bus.emit("preset:delete", presetId);
    this.close();
  }
}
