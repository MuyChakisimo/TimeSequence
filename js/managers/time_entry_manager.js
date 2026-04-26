export class TimeEntryManager {
  constructor(bus, timeEntryComponent, logger) {
    this.bus = bus;
    this.timeEntryComponent = timeEntryComponent;
    this.logger = logger;
  }

  init() {
    this.timeEntryComponent.bindCloseEvents(() => {
      this.close();
    });

    this.bus.on("time-entry:open", () => {
      this.open();
    });

    this.bus.on("time-entry:close", () => {
      this.close();
    });
  }

  open() {
    this.timeEntryComponent.open();
    this.logger.info("Time entry window opened");
  }

  close() {
    this.timeEntryComponent.close();
    this.logger.info("Time entry window closed");
  }
}
