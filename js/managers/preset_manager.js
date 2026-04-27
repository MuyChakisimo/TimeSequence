export class PresetManager {
  constructor() {
    this.key = "time-sequence-presets";
    this.presets = this.loadPresets();
  }

  createId() {
    return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  loadPresets() {
    try {
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to load presets:", error);
      return [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.presets));
    } catch (error) {
      console.error("Failed to save presets:", error);
    }
  }

  getPresets() {
    return this.presets;
  }

  getPresetById(id) {
    return this.presets.find((preset) => preset.id === id) || null;
  }

  addPreset(data) {
    const preset = {
      id: this.createId(),
      name: data?.name?.trim() || "",
      timers: this.normalizeTimers(data?.timers || []),
    };

    this.presets.push(preset);
    this.saveToStorage();
    return preset;
  }

  updatePreset(id, data) {
    const preset = this.getPresetById(id);
    if (!preset) return null;

    preset.name = data?.name?.trim() || "";
    preset.timers = this.normalizeTimers(data?.timers || []);
    this.saveToStorage();

    return preset;
  }

  savePreset(data) {
    if (data?.id) {
      return this.updatePreset(data.id, data);
    }

    return this.addPreset(data);
  }

  deletePreset(id) {
    const index = this.presets.findIndex((preset) => preset.id === id);
    if (index === -1) return false;

    this.presets.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  normalizeTimers(timers = []) {
    return timers
      .map((timer, index) => ({
        label: timer?.label?.trim() || `Timer ${index + 1}`,
        duration: Number(timer?.duration || 0),
      }))
      .filter((timer) => timer.duration > 0);
  }
}
