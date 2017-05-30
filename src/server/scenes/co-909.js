
import Metronome from '../Metronome';

export default class SceneCo909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    const numSteps = config.numSteps;
    const numInstruments = config.playerInstruments.length;

    this.instrumentSequences = new Array(numInstruments);

    for (let i = 0; i < numInstruments; i++) {
      this.instrumentSequences[i] = new Array(numSteps);
      this.resetInstrumentSequence(i);
    }

    this.primaryColors = ["0xFF0000", "0x00FF55", "0x023EFF", "0xFFFF00", "0xD802FF", "0x00FFF5", "0xFF0279", "0xFF9102"];

    this.onTempoChange = this.onTempoChange.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);
    this.onClear = this.onClear.bind(this);

    // display
    this.onButtonTurned = this.onButtonTurned.bind(this);

    this.metronome = new Metronome(experience.scheduler, experience.metricScheduler, numSteps, numSteps, this.onMetroBeat);
  }

  enter() {
    const experience = this.experience;
    this.experience.sharedParams.addParamListener('tempo', this.onTempoChange);
    experience.ledDisplay.addListener('buttonTurned', this.onButtonTurned);

    this.metronome.start();

    for (let client of experience.clients)
      this.clientEnter(client);
  }

  exit() {
    const experience = this.experience;
    this.experience.sharedParams.removeParamListener('tempo', this.onTempoChange);
    experience.ledDisplay.removeListener('buttonTurned', this.onButtonTurned);

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
    const experience = this.experience;


    let displaySelector = Math.round((32.0 / 16.0) * beat);

    /// clear screen
    experience.ledDisplay.clearPixels();
    
    //console.log(displaySelector);
    /// Display grid
    for (let i=0; i<16; i++) {
      let ds = Math.round((32.0 / 16.0) * i);
      experience.ledDisplay.line(ds, "0x808080");
    }
    ///
    /// show instruments
    for (let inst = 0; inst < instrumentSequences.length; inst++) {
      let sequence = instrumentSequences[inst];
      for (let i = 0; i < sequence.length; i++) {
        if ((sequence[i] === 1) || (sequence[i] === 2)) {
          let ds = Math.round((32.0 / 16.0) * i);
          experience.ledDisplay.ledOnLine(ds, inst%4, this.primaryColors[inst]);
        }
      }
    }
    ///
    ///current beat line
    experience.ledDisplay.line(displaySelector, "0xFFFBCB");

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

    // 0xFF0000 - rouge
    // 0x00FF55 - green
    // 0x023EFF - Blue
    // 0xFFFF00 - Yellow

    // 0xD802FF violet
    // 0x00FFF5 cyan
    // 0xFF0279 rose 
    // 0xFF9102 orange
    /// draw screen
    experience.ledDisplay.redraw();
    console.log(str, beat);
  }

  onSwitchNote(instrument, beat, state) {
    const experience = this.experience;
    experience.broadcast('barrel', null, 'switchNote', instrument, beat, state);
    this.setNoteState(instrument, beat, state);
  }

  onClear() {
    this.resetAllInstrumentSequences();
  }

  onButtonTurned(data) {
    console.log("button turned:", data);
  }
}
