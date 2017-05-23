import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneCoMix {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.notes = null;

    const numTracks = config.tracks.length;
    this.outputBusses = experience.outputBusses;

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onDisconnectClient = this.onDisconnectClient.bind(this);
  }

  enterScene() {
    const experience = this.experience;
    experience.metricScheduler.addMetronome(this.onMetroBeat, 1, 1);
    experience.receive('disconnectClient', this.onDisconnectClient);
  }

  enter() {
    const experience = this.experience;

    if(this.notes) {
      this.enterScene();
    } else {
      const trackConfig = this.config.tracks;
      experience.audioBufferManager.loadFiles(trackConfig).then((tracks) => {
        this.tracks = tracks;
        this.enterScene();        
      });
    }
  }

  exit() {
    const experience = this.experience;
    experience.metricScheduler.removeMetronome(this.onMetroBeat);
    experience.stopReceiving('disconnectClient', this.onDisconnectClient);
  }

  stopTrack(step) {

  }

  onMetroBeat(measure, beat) {
    const time = audioScheduler.currentTime;
  }

  onDisconnectClient(index) {
    this.stopTrack(step);
  }
}
