export class AudioManager {
  constructor(logger) {
    this.logger = logger;
  }

  buzz(enabled) {
    if (!enabled) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, context.currentTime);

      gainNode.gain.setValueAtTime(0.001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.15,
        context.currentTime + 0.02,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.35,
      );

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.35);

      oscillator.onended = () => {
        context.close();
      };
    } catch (error) {
      this.logger.warn("Buzzer could not play", error);
    }
  }
}
