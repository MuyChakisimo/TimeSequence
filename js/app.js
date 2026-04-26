import { EventBus } from "./core/event-bus.js";
import { Logger } from "./core/logger.js";
import { StorageManager } from "./managers/storage-manager.js";
import { AudioManager } from "./managers/audio-manager.js";
import { PresetManager } from "./managers/preset-manager.js";
import { SequenceManager } from "./managers/sequence-manager.js";
import { TimerManager } from "./managers/timer-manager.js";
import { UIManager } from "./managers/ui-manager.js";
import { AppManager } from "./managers/app-manager.js";
import { TimeEntryManager } from "./managers/time_entry_manager.js";
import { TimeEntry } from "./time_entry/time_entry.js";

const bus = new EventBus();
const logger = new Logger(true);
const storage = new StorageManager("time-sequence-state", logger);
const audio = new AudioManager(logger);
const presets = new PresetManager();
const sequence = new SequenceManager(bus, storage, logger);
const timer = new TimerManager(bus, audio, logger);
const ui = new UIManager(bus, presets, logger);

const timeEntry = new TimeEntry();
const timeEntryManager = new TimeEntryManager(bus, timeEntry, logger);

const app = new AppManager({
  bus,
  logger,
  storage,
  audio,
  presets,
  sequence,
  timer,
  ui,
});

timeEntryManager.init();
app.init();
