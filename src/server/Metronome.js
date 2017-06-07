import TimeEngine from './waves-audio/time-engine';

export default class Metronome extends TimeEngine {
  constructor(scheduler, metricScheduler, numBeats, metricDiv, callback) {
    super();

    this.scheduler = scheduler;
    this.metricScheduler = metricScheduler;
    this.numBeats = numBeats;
    this.metricDiv = metricDiv;
    this.callback = callback;

    this.beatLength = 1 / metricDiv;
    this.measureLength = numBeats * this.beatLength;

    this.beatPeriod = undefined;
    this.measureCount = undefined;
    this.beatCount = undefined;
  }

  advanceTime(time) {
    let measureCount = this.measureCount;
    let beatCount = this.beatCount;

    this.callback(measureCount, beatCount);

    beatCount++;

    if (beatCount >= this.numBeats) {
      measureCount++;
      beatCount = 0;
    }

    this.measureCount = measureCount;
    this.beatCount = beatCount;

    return time + this.beatPeriod;
  }

  sync() {
    if (this.master) {
      const metricPosition = this.metricScheduler.metricPosition;
      const floatMeasures = metricPosition / this.measureLength;
      let measureCount = Math.floor(floatMeasures);
      const measurePhase = floatMeasures - measureCount;
      const metricSpeed = this.metricScheduler.tempo * this.metricScheduler.tempoUnit / 60;
      let beatCount = Math.ceil(this.numBeats * measurePhase);

      if (beatCount === this.numBeats) {
        measureCount++;
        beatCount = 0;
      }

      this.beatPeriod = this.beatLength / metricSpeed;
      this.measureCount = measureCount; // current measure
      this.beatCount = beatCount; // next beat

      const startPosition = measureCount * this.measureLength + beatCount * this.beatLength;
      const startTime = this.metricScheduler.getSyncTimeAtMetricPosition(startPosition);
      this.scheduler.resetEngineTime(this, startTime);
    }
  }

  start() {
    if (!this.master) {
      this.scheduler.add(this, Infinity);
      this.sync();
    }
  }

  stop() {
    if (this.master)
      this.scheduler.remove(this);
  }
}
