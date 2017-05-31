import * as soundworks from 'soundworks/client';
const audio = soundworks.audio;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class QueenPlayer {
  constructor() {
    this.tracks = [];
  }

  stopAllTracks() {

  }

  start(index, track) {
    this.tracks[index] = track;

    // activate synth
  }

  stop(index) {
    // desactivate synth
  }

  updateMotionData(index, value) {

  }
}
