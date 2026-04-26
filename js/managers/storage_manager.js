export class StorageManager {
  constructor(key, logger) {
    this.key = key;
    this.logger = logger;
  }

  save(state) {
    localStorage.setItem(this.key, JSON.stringify(state));
    this.logger.info("State saved");
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      this.logger.error("Failed to load state", error);
      return null;
    }
  }

  clear() {
    localStorage.removeItem(this.key);
    this.logger.info("State cleared");
  }
}
