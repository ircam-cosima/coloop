import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneCo909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.instruments = null;

    const numSteps = config.numSteps;
    const numInstruments = config.barrelInstruments.length;

    this.instrumentSequences = new Array(numInstruments);

    for (let i = 0; i < numInstruments; i++) {
      this.instrumentSequences[i] = new Array(numSteps);
      this.resetInstrumentSequence(i);
    }

    this.outputBusses = experience.outputBusses;

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);
    this.onDisconnectClient = this.onDisconnectClient.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  enterScene() {
    const experience = this.experience;
    const numSteps = this.config.numSteps;
    experience.metricScheduler.addMetronome(this.onMetroBeat, numSteps, numSteps);
    experience.receive('switchNote', this.onSwitchNote);
    experience.receive('disconnectClient', this.onDisconnectClient);
    experience.sharedParams.addParamListener('clear', this.onClear);    
  }

  enter() {
    const experience = this.experience;

    if(this.instruments) {
      this.enterScene();
    } else {
      const instrumentConfig = this.config.barrelInstruments;
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
    experience.stopReceiving('disconnectClient', this.onDisconnectClient);
    experience.sharedParams.removeParamListener('clear', this.onClear());
  }

  resetInstrumentSequence(instrument) {
    const sequence = this.instrumentSequences[instrument];

    for (let i = 0; i < sequence.length; i++) {
      sequence[i] = 0;
    }
  }

  onMetroBeat(measure, beat) {
    const time = audioScheduler.currentTime;

    for (let i = 0; i < this.instrumentSequences.length; i++) {
      const instrument = this.instruments[i];
      const sequence = this.instrumentSequences[i];
      const state = sequence[beat];

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
