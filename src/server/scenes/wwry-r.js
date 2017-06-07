import Metronome from '../Metronome';
import Placer from './Placer';
import colorConfig from '../../shared/color-config';
const playerColors = colorConfig.players;

const numBeats = 8;
const numMeasures = 1;

export default class SceneWwryR {
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
    this.onMotionEvent = this.onMotionEvent.bind(this);

    this.metronome = new Metronome(experience.scheduler, experience.metricScheduler, numBeats * numMeasures, numBeats, this.onMetroBeat);
  }

  clientEnter(client) {
    const experience = this.experience;
    const clientIndex = client.index;

    experience.receive(client, 'motionEvent', this.onMotionEvent);

    this.isPlacing[clientIndex] = true;
    this.placer.start(client, () => {
      this.isPlacing[clientIndex] = false;
    });
  }

  clientExit(client) {
    const experience = this.experience;
    const clientIndex = client.index;

    experience.stopReceiving(client, 'motionEvent', this.onMotionEvent);

    if (this.isPlacing[clientIndex]) {
      this.placer.stop(client);
      this.isPlacing[clientIndex] = false;
    }
  }

  enter() {
    const experience = this.experience;
    experience.sharedParams.update('tempo', this.config.tempo);
    experience.enableTempoChange(false);
    experience.ledDisplay.screenOff();

    this.metronome.start();
  }

  exit() {
    const experience = this.experience;
    this.metronome.stop();
    experience.sharedParams.update('tempo', this.config.tempo);
    experience.enableTempoChange(true);
  }

  onMetroBeat(measure, beat) {
    // control LEDs turning around for each measure ???
    // could also use trackCutoffs and/or trackLayers of the 8 tracks (this.tracks.length = 8)

    const experience = this.experience;

    let connectedUsers = 0;
    for (let i = 0; i < numBeats; i++) {
      const isPlacing = this.isPlacing[i];
      if ((isPlacing === true) || (isPlacing === false)) {
        connectedUsers++;
      }
    }


    if (connectedUsers > 0) {
      /// BLINK NEWCOMMERS
      experience.ledDisplay.clearPixels();
      for (let i = 0; i < numBeats; i++) {
        const isPlacing = this.isPlacing[i];

        if (isPlacing) {
          if (beat <= numBeats / 2) {
            const pC = '0x' + playerColors[i];
            experience.ledDisplay.segment(i, pC);
          }
        }
      }
      experience.ledDisplay.redraw();
    }

    if (connectedUsers === 0) {
      experience.ledDisplay.clearPixels();
      experience.ledDisplay.circle(beat % 4, '0xFFFBCB');
      experience.ledDisplay.redraw();
    }
    //console.log(connectedUsers, beat);
  }

  onMotionEvent(index, data) {

    const experience = this.experience;
    experience.broadcast('barrel', null, 'motionEvent', index, data);

    //console.log(index, data);
    if (!(index === 0)) {

      if (index === 4) { /// chord specail case
        if (data > 0.5) {
          experience.ledDisplay.clearPixels();
          experience.ledDisplay.segment(index, playerColors[index]);
          experience.ledDisplay.redraw();
        }
      } else { // all other instruments
        experience.ledDisplay.clearPixels();
        experience.ledDisplay.segment(index, playerColors[index]);
        experience.ledDisplay.redraw();
      }
    } else {
      experience.ledDisplay.clearPixels();
      experience.ledDisplay.circle(0, playerColors[index]);
      experience.ledDisplay.circle(3, playerColors[index]);
      experience.ledDisplay.redraw();
    }

    if (!(index === 4)) {
      setTimeout(() => {
        experience.ledDisplay.screenOff();
      }, 100);
    }

  }
}
