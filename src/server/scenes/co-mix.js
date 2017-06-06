import Metronome from '../Metronome';
import Placer from './Placer';
import colorConfig from '../../shared/color-config';
const playerColors = colorConfig.players;

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
    experience.enableTempoChange(false);

    this.metronome.start();
  }

  exit() {
    this.metronome.stop();

    const experience = this.experience;
    experience.sharedParams.update('tempo', this.config.tempo);
    experience.enableTempoChange(true);
  }

  stopTrack(step) {

  }

  stopAllTracks() {
    for (let i = 0; i < this.tracks.length; i++)
      this.stopTrack(i);
  }

  onMetroBeat(measure, beat) {
    const experience = this.experience;
    const numTracks = this.tracks.length;

    // control LED display
    experience.ledDisplay.clearPixels();
    experience.ledDisplay.line(beat, "0xFFFBCB");

    if (beat > 0) {
      experience.ledDisplay.line(beat - 1, "0xC7C49E");
    } else {
      experience.ledDisplay.line(32 - 1, "0xC7C49E");
    }
    if (beat > 1) {
      experience.ledDisplay.line(beat - 2, "0x8A886E");
    }
    if (beat > 2) {
      experience.ledDisplay.line(beat - 3, "0x434235");
    }

    for (let i = 0; i < this.tracks.length; i++) {
      const isPlacing = this.isPlacing[i];

      if (isPlacing) {
        //this.placer.setBlinkState(i, beat > numBeats / 2);

        if (beat <= numBeats / 2)
          experience.ledDisplay.segment(i, '0x' + playerColors[i]);
      } else if (this.trackCutoffs[i] > 0) {
        let ccc = this.colorLuminance(playerColors[i], 0 - (1 - this.trackCutoffs[i]));
        experience.ledDisplay.segment(i, '0x' + ccc);
      }
    }

    experience.ledDisplay.redraw();
    // control LEDs turning around for each measure ???
    // could also use trackCutoffs and/or trackLayers of the 8 tracks (this.tracks.length = 8)
    console.log(beat);
  }

  mapF(value,
    istart, istop,
    ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  }

  colorLuminance(hex, lum) {
    // validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');

    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    lum = lum || 0;

    // convert to decimal and change luminosity
    var rgb = '', c, i;

    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ('00' + c).substr(c.length);
    }

    return rgb;
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
