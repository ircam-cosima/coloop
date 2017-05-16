import * as soundworks from 'soundworks/client';
import machineDefinition from '../../shared/machine-definition';

function dbToLin(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
}

const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-center">
      <p class="big"><%= title %></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

const model = { title: `Barrel` };

export default class BarrelExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'], showDialog: false });

    this.sharedParams = this.require('shared-params');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: machineDefinition.instruments,
    });

    this.metricScheduler = this.require('metric-scheduler');

    this.instrumentSequences = new Array(machineDefinition.instruments.length);
    for (let i = 0; i < this.instrumentSequences.length; i++) {
      this.instrumentSequences[i] = new Array(machineDefinition.numSteps);
      this.resetInstrumentSequence(i);
    }
  }

  start() {
    super.start();

    // initialize the view
    this.view = new soundworks.CanvasView(template, model, {}, {
      id: this.id,
      preservePixelRatio: true,
    });

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      // initialize audio output
      this.master = audioContext.createGain();
      this.master.connect(audioContext.destination);
      this.master.gain.value = 1;

      this.receive('connectInstrument', (instrument) => {});
      this.receive('disconnectInstrument', (instrument) => this.resetInstrumentSequence(instrument));

      this.receive('switchNote', (instrument, beat, state) => this.setNoteState(instrument, beat, state));
      this.receive('clearAllNotes', () => this.resetAllInstrumentSequences());

      this.instruments = this.audioBufferManager.data;

      const metrofunction = (measureCount, beatCount) => {
        this.playBeat(beatCount);
      };

      this.metricScheduler.addMetronome(metrofunction, 16, 16);
    });
  }

  resetInstrumentSequence(instrument) {
    const sequence = this.instrumentSequences[instrument];

    for (let i = 0; i < sequence.length; i++) {
      sequence[i] = 0;
    }
  }

  resetAllInstrumentSequences() {
    for (let i = 0; i < this.instrumentSequences.length; i++)
      this.resetInstrumentSequence(i);
  }

  setNoteState(instrument, beat, state) {
    const sequence = this.instrumentSequences[instrument];
    sequence[beat] = state;
  }

  getNoteState(instrument, beat) {
    const sequence = this.instrumentSequences[instrument];
    return sequence[beat] || 0;
  }

  playBeat(beat) {
    const time = audioScheduler.currentTime;

    for (let i = 0; i < this.instrumentSequences.length; i++) {
      const instrument = this.instruments[i];
      const sequence = this.instrumentSequences[i];
      const state = sequence[beat];

      if (state > 0) {
        const src = audioContext.createBufferSource();
        src.connect(this.master);
        src.buffer = (state === 1) ? instrument.low : instrument.high;
        src.start(time);
      }
    }
  }
}
