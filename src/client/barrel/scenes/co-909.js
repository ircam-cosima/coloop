import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneCo909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.outputBusses = experience.outputBusses;

    this.instruments = this.config.instruments;
    this.instrumentSequences = new Array(config.instruments.length);

    for (let i = 0; i < this.instrumentSequences.length; i++) {
      this.instrumentSequences[i] = new Array(config.numSteps);
      this.resetInstrumentSequence(i);
    }

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);
    this.onDisconnectClient = this.onDisconnectClient.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  enter() {
    const experience = this.experience;
    experience.metricScheduler.addMetronome(this.onMetroBeat, 16, 16);
    experience.receive('switchNote', this.onSwitchNote);
    experience.receive('disconnectClient', this.onDisconnectClient);
    experience.sharedParams.addParamListener('clear', this.onClear);
  }

  exit() {
    const experience = this.experience;
    experience.metricScheduler.removeMetronome(this.onMetroBeat);
    experience.stopReceiving('switchNote', this.onSwitchNote);
    experience.stopReceiving('disconnectClient', this.onDisconnectClient);
    experience.sharedParams.removeParamListener('clear', this.onClear());
  }

  resetInstrumentSequence(instrument) {
    const sequence = this.instrumentSequences[instrument];

    for (let i = 0; i < sequence.length; i++) {
      sequence[i] = 0;
    }
  }

  onMetroBeat(measureCount, beatCount) {
    const time = audioScheduler.currentTime;

    for (let i = 0; i < this.instrumentSequences.length; i++) {
      const instrument = this.instruments[i];
      const sequence = this.instrumentSequences[i];
      const state = sequence[beatCount];

      if (state > 0) {
        const src = audioContext.createBufferSource();
        src.connect(this.outputBusses[i]);
        src.buffer = (state === 1) ? instrument.low : instrument.high;
        src.start(time);
      }
    }
  }

  onSwitchNote(instrument, beat, state) {
    const sequence = this.instrumentSequences[instrument];
    sequence[beat] = state;
  }

  onDisconnectClient(instrument) {
    this.resetInstrumentSequence(instrument);
  }

  onClear() {
    for (let i = 0; i < this.instrumentSequences.length; i++)
      this.resetInstrumentSequence(i);
  }
}
