import * as soundworks from 'soundworks/client';
import Placer from './Placer';
import QueenPlayer from '../../shared/QueenPlayer';
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
    this.tracks = [];

    this.onMotionEvent = this.onMotionEvent.bind(this);
  }

  clientEnter(index) {
    const experience = this.experience;

    this.placer.start(index, () => {
      const queenPlayer = this.queenPlayer;

      if (queenPlayer)
        queenPlayer.startTrack(index, this.tracks[index]);
    });
  }

  clientExit(index) {
    const queenPlayer = this.queenPlayer;

    if (queenPlayer)
      queenPlayer.stopTrack(index);
  }

  enterScene() {
    const experience = this.experience;
    experience.receive('motionEvent', this.onMotionEvent);

    if (!this.queenPlayer)
      this.queenPlayer = new QueenPlayer(this.outputBusses);
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
    experience.stopReceiving('motionEvent', this.onMotionEvent);

    this.placer.clear();
  }

  onMotionEvent(index, data) {
    const queenPlayer = this.queenPlayer;

    if (queenPlayer)
      queenPlayer.onMotionEvent(index, data);
  }
}
