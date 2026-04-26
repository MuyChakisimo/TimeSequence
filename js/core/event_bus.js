export class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(handler);
  }

  off(eventName, handler) {
    if (!this.events.has(eventName)) return;
    this.events.get(eventName).delete(handler);
  }

  emit(eventName, payload) {
    if (!this.events.has(eventName)) return;
    for (const handler of this.events.get(eventName)) {
      handler(payload);
    }
  }
}
