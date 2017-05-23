import Metronome from '../Metronome';
import Placer from './Placer';

const numBeats = 4;
const numMeasures = 4;

export default class CoMix {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    const numTracks = config.tracks.length;
    this.isPlacing = new Array(numTracks);

    this.onTempoChange = this.onTempoChange.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onTrackIntensity = this.onTrackIntensity.bind(this);
    this.onClear = this.onClear.bind(this);

    this.metronome = new Metronome(experience.scheduler, experience.metricScheduler, numBeats * numMeasures, numBeats, this.onMetroBeat);
  }

  enter() {
    const experience = this.experience;

    experience.sharedParams.addParamListener('tempo', this.onTempoChange);
    experience.sharedParams.addParamListener('clear', this.onClear);

    this.metronome.start();

    for (let client of experience.clients)
      this.clientEnter(client);
  }

  exit() {
    const experience = this.experience;

    experience.sharedParams.removeParamListener('tempo', this.onTempoChange);
    experience.sharedParams.removeParamListener('clear', this.onClear);

    this.metronome.stop();

    for (let client of experience.clients)
      this.clientExit(client);

    this.stopAllTracks();
  }

  clientEnter(client) {
    this.experience.receive(client, 'trackIntensity', this.onTrackIntensity);

    this.isPlacing[client.index] = true;
    this.placer.start(client, () => {
      this.isPlacing[client.index] = false;
    });
  }

  clientExit(client) {
    this.stopTrack(client.index);
    this.experience.stopReceiving(client, 'trackIntensity', this.onTrackIntensity);

    this.placer.stop(client);
    this.isPlacing[client.index] = false;
  }

  stopTrack(step) {

  }

  stopAllTracks() {
    for (let i = 0; i < this.tracks.length; i++)
      this.stopTrack(i);
  }

  onTempoChange(tempo) {

  }

  onMetroBeat(measure, beat) {

  }

  onTrackIntensity(step, note, state) {
    experience.broadcast('barrel', null, 'trackIntensity', track, intensity);
  }

  onClear() {

  }
}
