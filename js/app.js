import { EventBus } from "./core/event_bus.js";
import { Logger } from "./core/logger.js";
import { StorageManager } from "./managers/storage-manager.js";
import { AudioManager } from "./managers/audio-manager.js";
import { PresetManager } from "./managers/preset-manager.js";
import { SequenceManager } from "./managers/sequence-manager.js";
import { TimerManager } from "./managers/timer-manager.js";
import { UIManager } from "./managers/ui-manager.js";
import { AppManager } from "./managers/app-manager.js";

const bus = new EventBus();
const logger = new Logger(true);
const storage = new StorageManager("time-sequence-state", logger);
const audio = new AudioManager(logger);
const presets = new PresetManager();
const sequence = new SequenceManager(bus, storage, logger);
const timer = new TimerManager(bus, audio, logger);
const ui = new UIManager(bus, presets, logger);

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

app.init();
