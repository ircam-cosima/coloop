import * as soundworks from 'soundworks/client';
import { decibelToLinear } from 'soundworks/utils/math';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneCo909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.instruments = null;

    const numSteps = config.numSteps;
    const numInstruments = config.instruments.length;

    this.instrumentSequences = new Array(numInstruments);

    for (let i = 0; i < numInstruments; i++) {
      this.instrumentSequences[i] = new Array(numSteps);
      this.resetInstrumentSequence(i);
    }

    this.outputBusses = experience.outputBusses;

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);
  }

  clientEnter(index) {}

  clientExit(index) {
    this.resetInstrumentSequence(index);
  }

  enterScene() {
    const experience = this.experience;
    const numSteps = this.config.numSteps;
    experience.metricScheduler.addMetronome(this.onMetroBeat, numSteps, numSteps, 1, 0, true);
    experience.receive('switchNote', this.onSwitchNote);
  }

  enter() {
    const experience = this.experience;

    if (this.instruments) {
      this.enterScene();
    } else {
      const instrumentConfig = this.config.instruments;
      experience.audioBufferManager.loadFiles(instrumentConfig).then((instruments) => {
        this.instruments = instruments;
        this.enterScene();
      });
    }
  }

  exit() {
    const experience = this.experience;
    experience.metricScheduler.removeMetronome(this.onMetroBeat);
    experience.stopReceiving('switchNote', this.onSwitchNote);
  }

  resetInstrumentSequence(instrument) {
    const sequence = this.instrumentSequences[instrument];

    for (let i = 0; i < sequence.length; i++) {
      sequence[i] = 0;
    }
  }

  clear() {
    for (let i = 0; i < this.instrumentSequences.length; i++)
      this.resetInstrumentSequence(i);
  }

  onMetroBeat(measure, beat) {
    const time = audioScheduler.currentTime;

    for (let i = 0; i < this.instrumentSequences.length; i++) {
      const instrument = this.instruments[i];
      const sequence = this.instrumentSequences[i];
      const state = sequence[beat];

      if (state > 0) {
        const layer = instrument.layers[state - 1];

        const gain = audioContext.createGain(); 
        gain.connect(this.outputBusses[i]);
        gain.gain.value = decibelToLinear(layer.gain);

        const src = audioContext.createBufferSource();
        src.connect(gain);
        src.buffer = layer.buffer;
        src.start(time);
      }
    }
  }

  onSwitchNote(instrument, beat, state) {
    const sequence = this.instrumentSequences[instrument];
    sequence[beat] = state;
  }
}
