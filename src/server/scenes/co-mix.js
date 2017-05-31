import Metronome from '../Metronome';
import Placer from './Placer';

const numBeats = 32;
const numMeasures = 1;

export default class CoMix {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    this.tracks = config.tracks;
    const numTracks = config.tracks.length;
    this.isPlacing = new Array(numTracks);
    this.trackCutoffs = [0, 0, 0, 0, 0, 0, 0, 0];
    this.trackLayers = [0, 0, 0, 0, 0, 0, 0, 0];

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onTrackCutoff = this.onTrackCutoff.bind(this);
    this.onSwitchLayer = this.onSwitchLayer.bind(this);

    this.metronome = new Metronome(experience.scheduler, experience.metricScheduler, numBeats * numMeasures, numBeats, this.onMetroBeat);
  }

  clientEnter(client) {
    const experience = this.experience;
    const clientIndex = client.index;

    experience.receive(client, 'trackCutoff', this.onTrackCutoff);
    experience.receive(client, 'switchLayer', this.onSwitchLayer);

    this.isPlacing[clientIndex] = true;
    this.placer.start(client, () => {
      this.isPlacing[clientIndex] = false;
    });
  }

  clientExit(client) {
    const experience = this.experience;
    const clientIndex = client.index;

    this.stopTrack(clientIndex);
    experience.stopReceiving(client, 'trackCutoff', this.onTrackCutoff);
    experience.stopReceiving(client, 'switchLayer', this.onSwitchLayer);

    if (this.isPlacing[clientIndex]) {
      this.placer.stop(client);
      this.isPlacing[clientIndex] = false;
    }
  }

  enter() {
    const experience = this.experience;
    experience.sharedParams.update('tempo', this.config.tempo);
    experience.sharedParams.removeParamListener('tempo', experience.onTempoChange);

    this.metronome.start();
  }

  exit() {    
    this.metronome.stop();
    
    const experience = this.experience;
    experience.sharedParams.update('tempo', this.config.tempo);
    experience.sharedParams.addParamListener('tempo', experience.onTempoChange);
  }

  stopTrack(step) {

  }

  stopAllTracks() {
    for (let i = 0; i < this.tracks.length; i++)
      this.stopTrack(i);
  }

  onMetroBeat(measure, beat) {
    // control LEDs turning around for each measure ???
    // could also use trackCutoffs and/or trackLayers of the 8 tracks (this.tracks.length = 8)
    console.log(beat);
  }

  onTrackCutoff(track, value) {
    this.trackCutoffs[track] = value;

    const experience = this.experience;
    experience.broadcast('barrel', null, 'trackCutoff', track, value);
  }

  onSwitchLayer(track, value) {
    this.trackLayers[track] = value;

    const experience = this.experience;
    experience.broadcast('barrel', null, 'switchLayer', track, value);
  }
}
