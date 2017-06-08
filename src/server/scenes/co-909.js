import Metronome from '../Metronome';
import Placer from './Placer';
import colorConfig from '../../shared/color-config';
const playerColors = colorConfig.players;

export default class SceneCo909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    const numSteps = config.numSteps;
    const numInstruments = config.instruments.length;

    this.instrumentSequences = new Array(numInstruments);
    this.isPlacing = new Array(numInstruments);

    for (let i = 0; i < numInstruments; i++) {
      this.instrumentSequences[i] = new Array(numSteps);
      this.resetInstrumentSequence(i);
    }

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);

    // display
    this.onButtonTurned = this.onButtonTurned.bind(this);

    this.metronome = new Metronome(experience.scheduler, experience.metricScheduler, numSteps, numSteps, this.onMetroBeat);
  }

  clientEnter(client) {
    const experience = this.experience;
    const clientIndex = client.index;

    experience.receive(client, 'switchNote', this.onSwitchNote);

    this.isPlacing[clientIndex] = true;
    this.placer.start(client, () => {
      this.isPlacing[clientIndex] = false;
    });
  }

  clientExit(client) {
    const experience = this.experience;
    const clientIndex = client.index;

    // reset sequence of exiting client
    this.resetInstrumentSequence(client.index);

    experience.stopReceiving(client, 'switchNote', this.onSwitchNote);

    if (this.isPlacing[clientIndex]) {
      this.placer.stop(client);
      this.isPlacing[clientIndex] = false;
    }
  }

  enter() {
    const experience = this.experience;
    experience.ledDisplay.addListener('buttonTurned', this.onButtonTurned);
    experience.ledDisplay.screenOff();

    this.metronome.start();
  }

  exit() {
    const experience = this.experience;
    experience.ledDisplay.removeListener('buttonTurned', this.onButtonTurned);

    this.metronome.stop();
  }

  resetInstrumentSequence(instrument) {
    const sequence = this.instrumentSequences[instrument];

    for (let i = 0; i < sequence.length; i++) {
      sequence[i] = 0;
    }
  }

  setNoteState(instrument, beat, state) {
    const sequence = this.instrumentSequences[instrument];
    sequence[beat] = state;

  }

  setTempo(tempo) {
    setTimeout(() => this.metronome.sync(), 0);
  }

  clear() {
    for (let i = 0; i < this.instrumentSequences.length; i++)
      this.resetInstrumentSequence(i);
  }

  onMetroBeat(measure, beat) {
    const experience = this.experience;
    const instrumentSequences = this.instrumentSequences;
    let displaySelector = Math.round((32.0 / 16.0) * beat);
    const numBeats = this.config.numSteps;

    /// clear screen
    experience.ledDisplay.clearPixels();

    let simpleGrid = true;
    for (let inst = 4; inst < instrumentSequences.length; inst++) {
      let sequence = instrumentSequences[inst];
      for (let i = 0; i < sequence.length; i++) {
        if ((sequence[i] === 1) || (sequence[i] === 2)) {
          simpleGrid = false;
          break;
        }
      }
    }

    //console.log(displaySelector);
    /// Display grid
    if (simpleGrid) {
      for (let i = 0; i < 16; i++) {
        let ds = Math.round((32.0 / 16.0) * i);
        experience.ledDisplay.line(ds, "0x808080");
      }
    } else { // grid for more than 4 players
      for (let i = 0; i < 32; i++) {
        experience.ledDisplay.line(i, "0x808080");
      }
    }
    ///

    /// show instruments
    for (let inst = 0; inst < instrumentSequences.length; inst++) {
      let sequence = instrumentSequences[inst];
      for (let i = 0; i < sequence.length; i++) {
        if ((sequence[i] === 1) || (sequence[i] === 2)) {
          const colorCode = '0x' + playerColors[inst];
          let ds = Math.round((32.0 / 16.0) * i);

          if (inst <= 3) {
            experience.ledDisplay.ledOnLine(ds, inst % 4, colorCode);
          } else {
            if (ds <= 31)
              experience.ledDisplay.ledOnLine(ds + 1, inst % 4, colorCode);
            else
              experience.ledDisplay.ledOnLine(0, inst % 4, colorCode);
          }
        }
      }
    }
    ///

    ///current beat line
    if (simpleGrid) {
      experience.ledDisplay.line(displaySelector, "0xFFFBCB");
    } else {
      /// double line
      if (displaySelector < 31) {
        experience.ledDisplay.line(displaySelector, "0xFFFBCB");
        experience.ledDisplay.line(displaySelector + 1, "0xFFFBCB");
      } else {
        experience.ledDisplay.line(displaySelector, "0xFFFBCB");
        experience.ledDisplay.line(0, "0xFFFBCB");
      }
    }

    if (beat === 0)
      console.log("BD SD HH MT PC HT LT CY -", measure);

    let str = "";
    for (let i = 0; i < instrumentSequences.length; i++) {
      const isPlacing = this.isPlacing[i];
      const sequence = instrumentSequences[i];
      const state = sequence[beat];
      let char = '.  ';

      if (isPlacing) {
        char = '|  ';
        if (beat <= numBeats / 2) {
          experience.ledDisplay.segment(i, '0x' + playerColors[i]);
        }
      }

      if (state === 1)
        char = String.fromCharCode(0x25EF) + '  ';
      else if (state === 2)
        char = String.fromCharCode(0x25C9) + '  ';
      str += char;
    }

    /// draw screen
    experience.ledDisplay.redraw();
    console.log(str, beat);
  }

  onSwitchNote(instrument, beat, state) {
    const experience = this.experience;
    experience.broadcast('barrel', null, 'switchNote', instrument, beat, state);
    this.setNoteState(instrument, beat, state);
  }

  onButtonTurned(data) {
    console.log("button turned:", data);
  }
}
