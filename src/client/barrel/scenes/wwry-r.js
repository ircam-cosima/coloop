import * as soundworks from 'soundworks/client';
import Placer from './Placer';
import queenPlayer from '../../shared/QueenPlayer';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneWwryR {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.notes = null;

    const numTracks = config.tracks.length;
    this.outputBusses = experience.outputBusses;

    this.placer = new Placer(experience);
    this.queenPlayer = null;

    this.onMotionInput = this.onMotionInput.bind(this);
  }

  clientEnter(index) {
    const experience = this.experience;

    this.placer.start(index, () => {
      const queenPlayer = this.queenPlayer;

      if (queenPlayer)
        queenPlayer.enableTrack(index, true);
    });
  }

  clientExit(index) {
    const queenPlayer = this.queenPlayer;

    if (queenPlayer)
      queenPlayer.enableTrack(index, false);
  }

  enterScene() {
    const experience = this.experience;
    experience.receive('motionInput', this.onMotionInput);

    if (!this.queenPlayer) {
      const config = this.config;
      this.queenPlayer = new QueenPlayer(this.config);
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
    experience.stopReceiving('motionInput', this.onMotionInput);

    this.placer.clear();
    this.queenPlayer.stopAllTracks();
  }

  onMotionInput(index, time, value) {
    const queenPlayer = this.queenPlayer;

    if (queenPlayer)
      queenPlayer.updateMotionData(index, time, value);
  }
}
