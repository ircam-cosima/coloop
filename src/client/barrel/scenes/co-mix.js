import * as soundworks from 'soundworks/client';
import Placer from './Placer';
import LoopPlayer from '../../shared/LoopPlayer';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneCoMix {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.notes = null;

    const numTracks = config.tracks.length;
    this.outputBusses = experience.outputBusses;

    this.placer = new Placer(experience);
    this.loopPlayer = null;

    this.onTrackCutoff = this.onTrackCutoff.bind(this);
    this.onSwitchLayer = this.onSwitchLayer.bind(this);
  }

  clientEnter(index) {
    const experience = this.experience;

    this.placer.start(index, () => {
      const loopPlayer = this.loopPlayer;

      if (loopPlayer) {
        const track = this.tracks[index];
        loopPlayer.addLoopTrack(index, track.layers);
      }
    });
  }

  clientExit(index) {
    const loopPlayer = this.loopPlayer;

    if (loopPlayer)
      loopPlayer.removeLoopTrack(index);
  }

  enterScene() {
    const experience = this.experience;
    experience.receive('trackCutoff', this.onTrackCutoff);
    experience.receive('switchLayer', this.onSwitchLayer);

    if (!this.loopPlayer) {
      const config = this.config;
      this.loopPlayer = new LoopPlayer(experience.metricScheduler, this.outputBusses, 1, config.tempo, config.tempoUnit, 0.05);
    }
  }

  enter() {
    const experience = this.experience;

    if (this.notes) {
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
    experience.stopReceiving('trackCutoff', this.onTrackCutoff);
    experience.stopReceiving('switchLayer', this.onSwitchLayer);

    this.placer.clear();
    this.loopPlayer.stopAllTracks();
  }

  onTrackCutoff(index, value) {
    const loopPlayer = this.loopPlayer;

    if (loopPlayer)
      loopPlayer.setCutoff(index, value);
  }

  onSwitchLayer(index, value) {
    const loopPlayer = this.loopPlayer;

    if (loopPlayer)
      loopPlayer.setLayer(index, value);
  }
}
