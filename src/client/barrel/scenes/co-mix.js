import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();
import LoopPlayer from '../../shared/LoopPlayer';

export default class SceneCoMix {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.notes = null;

    const numTracks = config.tracks.length;
    this.outputBusses = experience.outputBusses;

    this.loopPlayer = null;

    this.onConnectClient = this.onDisconnectClient.bind(this);
    this.onDisconnectClient = this.onDisconnectClient.bind(this);
    this.onTrackCutoff = this.onTrackCutoff.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  enterScene() {
    const experience = this.experience;
    experience.receive('disconnectClient', this.onDisconnectClient);
    experience.receive('trackCutoff', this.onTrackCutoff);
    experience.sharedParams.addParamListener('clear', this.onClear);

    if(!this.loopPlayer)
      this.loopPlayer = new LoopPlayer(experience.metricScheduler, this.outputBusses, 1, config.tempo, config.tempoUnit, config.numBeats, 0.05);

    this.loopPlayer.addLoopTrack();
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
    experience.stopReceiving('disconnectClient', this.onDisconnectClient);
    experience.stopReceiving('trackCutoff', this.onTrackCutoff);
    experience.sharedParams.removeParamListener('clear', this.onClear);

    this.loopPlayer.stopAllTracks();
  }

  onConnectClient(index) {
    this.loopPlayer.addLoopTrack(index, loop);
  }

  onDisconnectClient(index) {
    const loopPlayer = this.loopPlayer;

    if(loopPlayer)
      loopPLayer.removeLoopTrack(index);
  }

  onTrackCutoff(index, value) {
    const loopPlayer = this.loopPlayer;

    if(loopPlayer)
      loopPLayer.setCutoff(index, value);
  }

  onClear() {

  }
}
