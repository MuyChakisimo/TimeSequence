export class PresetManager {
  getPresets() {
    return [
      {
        id: "pomodoro",
        name: "Pomodoro",
        timers: [
          { label: "Focus", duration: 25 * 60 },
          { label: "Short Break", duration: 5 * 60 },
          { label: "Focus", duration: 25 * 60 },
        ],
      },
      {
        id: "workout",
        name: "Workout",
        timers: [
          { label: "Warm Up", duration: 5 * 60 },
          { label: "Workout", duration: 20 * 60 },
          { label: "Cool Down", duration: 5 * 60 },
        ],
      },
      {
        id: "study",
        name: "Study Blocks",
        timers: [
          { label: "Study 1", duration: 45 * 60 },
          { label: "Break", duration: 10 * 60 },
          { label: "Study 2", duration: 45 * 60 },
        ],
      },
    ];
  }
}
