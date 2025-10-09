export class Timer {
  protected startTime: number;
  protected duration: number;
  protected callback: () => void;
  protected triggered: boolean = false;

  constructor(durationSeconds: number, callback: () => void) {
    this.startTime = performance.now();
    this.duration = durationSeconds * 1000;
    this.callback = callback;
  }

  update() {
    if (
      !this.triggered &&
      performance.now() - this.startTime >= this.duration
    ) {
      this.triggered = true;
      this.callback();
    }
  }
}

export class PeriodicTimer extends Timer {
  constructor(durationSeconds: number, callback: () => void) {
    super(durationSeconds, callback);
  }

  update() {
    const now = performance.now();
    if (now - this.startTime >= this.duration) {
      this.callback();
      this.startTime = now;
    }
  }
}
