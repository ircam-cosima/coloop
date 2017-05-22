import Metronome from '../Metronome';

export default class SceneCo909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    const numSteps = config.numSteps;
    const numInstruments = config.instruments.length;

    this.instrumentSequences = new Array(numInstruments);

    for (let i = 0; i < numInstruments; i++) {
      this.instrumentSequences[i] = new Array(numSteps);
      this.resetInstrumentSequence(i);
    }

    this.onTempoChange = this.onTempoChange.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);
    this.onClear = this.onClear.bind(this);

    this.metronome = new Metronome(experience.scheduler, experience.metricScheduler, numSteps, numSteps, this.onMetroBeat);
  }

  enter() {
    const experience = this.experience;
    experience.sharedParams.addParamListener('tempo', this.onTempoChange);

    this.metronome.start();

    for (let client of experience.clients)
      this.clientEnter(client);
  }

  exit() {
    const experience = this.experience;
    experience.sharedParams.removeParamListener('tempo', this.onTempoChange);

    this.metronome.stop();

    for (let client of experience.clients)
      this.clientExit(client);

    this.resetAllInstrumentSequences();
  }

  clientEnter(client) {
    const experience = this.experience;
    experience.receive(client, 'switchNote', this.onSwitchNote);
    experience.sharedParams.addParamListener('clear', this.onClear);
  }

  clientExit(client) {
    // reset sequence of exiting client
    this.resetInstrumentSequence(client.index);

    const experience = this.experience;
    experience.stopReceiving(client, 'switchNote', this.onSwitchNote);
    experience.sharedParams.removeParamListener('clear', this.onClear);
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

  onTempoChange(tempo) {
    if (this.metronome.master) {
      this.metronome.stop();
      this.metronome.start();
    }
  }

  onMetroBeat(measure, beat) {
    const instrumentSequences = this.instrumentSequences;

    if (beat === 0)
      console.log("BD SD HH MT PC HT LT CY -", measure);

    let str = "";
    for (let i = 0; i < instrumentSequences.length; i++) {
      const sequence = instrumentSequences[i];
      const state = sequence[beat];
      let char = '.  ';

      if (state === 1)
        char = String.fromCharCode(0x25EF) + '  ';
      else if (state === 2)
        char = String.fromCharCode(0x25C9) + '  ';

      str += char;
    }

    console.log(str);
  }

  onSwitchNote(instrument, beat, state) {
    const experience = this.experience;
    experience.broadcast('barrel', null, 'switchNote', instrument, beat, state);
    this.setNoteState(instrument, beat, state);
  }

  onClear() {
    this.resetAllInstrumentSequences();
  }
}
