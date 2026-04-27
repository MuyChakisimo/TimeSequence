import { EventBus } from "./core/event_bus.js";
import { Logger } from "./core/logger.js";
import { StorageManager } from "./managers/storage_manager.js";
import { AudioManager } from "./managers/audio_manager.js";
import { PresetManager } from "./managers/preset_manager.js";
import { SequenceManager } from "./managers/sequence_manager.js";
import { TimerManager } from "./managers/timer_manager.js";
import { UIManager } from "./managers/ui_manager.js";
import { AppManager } from "./managers/app_manager.js";
import { TimeEntryManager } from "./managers/time_entry_manager.js";
import { PresetEditorManager } from "./managers/preset_editor_manager.js";

import { TimeEntry } from "./time_entry/time_entry.js";
import { PresetEditor } from "./presets/preset_editor.js";

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

const presetEditor = new PresetEditor();
const presetEditorManager = new PresetEditorManager(
  bus,
  presetEditor,
  presets,
  logger,
);

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
presetEditorManager.init();
app.init();
