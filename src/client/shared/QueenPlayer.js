import * as soundworks from 'soundworks/client';
const audio = soundworks.audio;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

class HitEngine extends audio.SegmentEngine {
  constructor(track, output) {
    super();

    this.buffer = track.buffer;
    this.positionArray = track.markers.time;
    this.offsetArray = track.markers.offset;

    this.releaseRel = 0.25;

    this.connect(output);
  }

  start() {}

  stop() {}

  onMotionEvent(data) {
    this.segmentIndex = data;
    this.trigger();
  }
}

class PowerChordEngine extends audio.GranularEngine {
  constructor(track, output) {
    super();

    this.buffer = track.buffer;
    this.periodAbs = 0.01;
    this.periodRel = 0;
    this.durationAbs = 0.08;
    this.durationRel = 0;
    this.gain = 2 * this.periodAbs / this.durationAbs;

    this.connect(output);
  }

  start() {
    if (!this.master)
      audioScheduler.add(this);
  }

  stop() {
    if (this.master)
      audioScheduler.remove(this);
  }

  onMotionEvent(data) {
    var margin = 0.5 * this.durationAbs + this.positionVar;
    var range = this.buffer.duration - 2 * margin;
    this.position = margin + data * range;
  }
}

class GuitarRiffEngine extends audio.GranularEngine {
  constructor(track, output) {
    super();

    this.segments = track.markers;

    this.buffer = track.buffer;
    this.periodAbs = 0.010;
    this.periodRel = 0;
    this.durationAbs = 0.080;
    this.durationRel = 0;
    this.position = 0;
    this.positionVar = 0.02;
    this.gain = 0;

    this.segmentIndex = 15;
    this.playingPosition = 0;
    this.playingSpeed = 0;
    this.gainFactor = 2 * this.periodAbs / this.durationAbs;

    this.connect(output);
  }

  trigger(time) {
    const segments = this.segments;

    if (this.playingSpeed > 0 && this.playingPosition < segments[this.segmentIndex].end) {
      this.position = this.playingPosition;
      this.positionVar = 0;
      this.gain = this.gainFactor * 0.707;
    } else {
      this.position = segments[this.segmentIndex].end;
      this.positionVar = 0.02;

      if (this.playingSpeed !== 0) {
        this.playingSpeed = 0;
        this.gain = this.gainFactor * 1.0;
      } else {
        this.gain *= segments[this.segmentIndex].sustain;
      }
    }

    this.playingPosition += this.periodAbs * this.playingSpeed;

    return super.trigger(time);
  }

  start() {
    if (!this.master) {
      const segments = this.segments;

      this.segmentIndex = 15;
      this.playingPosition = segments[this.segmentIndex].start;
      this.playingSpeed = segments[this.segmentIndex].speed;
      this.gain = this.gainFactor * 0.707;

      audioScheduler.add(this);
    }
  }

  stop() {
    if (this.master)
      audioScheduler.remove(this);
  }

  onMotionEvent(data) {
    const segments = this.segments;

    this.playingPosition = segments[data].start;
    this.playingSpeed = segments[data].speed;

    this.segmentIndex = data;
  }
}

export default class QueenPlayer {
  constructor(outputs) {
    this.outputs = outputs;

    this.engines = [];

    this.onMotionEvent = this.onMotionEvent.bind(this);
  }

  startTrack(index, track) {
    let engine = this.engines[index];

    if (!engine) {
      switch (track.name) {
        case 'drums':
        case 'verse':
        case 'chorus':
        case 'freddy':
          engine = new HitEngine(track, this.outputs[index]);
          break;

        case 'power chord':
          engine = new PowerChordEngine(track, this.outputs[index]);
          break;

        case 'guitar riff':
          engine = new GuitarRiffEngine(track, this.outputs[index]);
          break;
      }

      this.engines[index] = engine;
    }

    engine.start();
  }

  stopTrack(index) {
    const engine = this.engines[index];

    if (engine)
      engine.stop();
  }

  onMotionEvent(index, data) {
    const engine = this.engines[index];

    if (engine)
      engine.onMotionEvent(data);
  }
}
