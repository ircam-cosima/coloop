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

    if(beatCount >= this.numBeats) {
      measureCount++;
      beatCount = 0;
    }

    this.measureCount = measureCount;
    this.beatCount = beatCount;

    return time + this.beatPeriod;
  }

  start() {
    const metricPosition = this.metricScheduler.metricPosition;
    const floatMeasures = metricPosition / this.measureLength;
    const measureCount = Math.ceil(floatMeasures);
    const metricSpeed = this.metricScheduler.tempo * this.metricScheduler.tempoUnit / 60;

    this.beatPeriod = this.beatLength / metricSpeed;
    this.measureCount = measureCount;
    this.beatCount = 0;

    const startPosition = measureCount * this.measureLength;
    const startTime = this.metricScheduler.getSyncTimeAtMetricPosition(startPosition);

    this.scheduler.add(this, startTime);
  }

  stop() {
    this.scheduler.remove(this);
  }
}
