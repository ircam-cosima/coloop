import * as soundworks from 'soundworks/client';
const audio = soundworks.audio;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

class SegmentEngine extends audio.SegmentEngine {
  constructor(track, output) {
    super();

    this.buffer = track.buffer;
    this.positionArray = track.markers.time;
    this.offsetArray = track.markers.offset;

    this.connect(output);
  }

  start() {}

  stop() {}

  onMotionEvent(data) {
    this.segmentIndex = data;
    this.trigger();
  }
}

export default class QueenPlayer {
  constructor(outputs) {
    this.engines = [];
    this.outputs = outputs;

    this.onMotionEvent = this.onMotionEvent.bind(this);
  }

  startTrack(index, track) {
    let engine = this.engines[index];

    if (!engine) {
      switch (track.name) {
        case 'drums':
        case 'verse':
        case 'chorus':
        case 'sing it':
        case 'power chord':
        case 'guitar riff':
          engine = new SegmentEngine(track, this.outputs[index]);
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
