import Metronome from '../Metronome';
import Placer from './Placer';
import colorConfig from '../../shared/color-config';
const playerColors = colorConfig.players;

const numBeats = 8;

export default class SceneCollectiveLoops {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    const numSteps = config.numSteps;
    const numNotes = config.notes.length;

    this.stepStates = new Array(numSteps);
    this.isPlacing = new Array(numSteps);

    for (let i = 0; i < numSteps; i++) {
      this.stepStates[i] = new Array(numNotes);
      this.resetStepStates(i);
    }

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);

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

    this.resetStepStates(clientIndex);
    this.experience.stopReceiving(client, 'switchNote', this.onSwitchNote);

    if (this.isPlacing[clientIndex]) {
      this.placer.stop(client);
      this.isPlacing[clientIndex] = false;
    }
  }

  enter() {
    this.metronome.start();
  }

  exit() {
    this.metronome.stop();
  }

  resetStepStates(step) {
    const states = this.stepStates[step];

    for (let i = 0; i < states.length; i++) {
      states[i] = 0;
    }
  }

  setNoteState(step, note, state) {
    const states = this.stepStates[step];
    states[note] = state;
  }

  setTempo(tempo) {
    this.metronome.sync();
  }

  clear() {
    for (let i = 0; i < this.stepStates.length; i++)
      this.resetStepStates(i);
  }

  onMetroBeat(measure, beat) {
    console.log('coucou:', measure, beat);

    const states = this.stepStates[beat];

    const isPlacing = this.isPlacing[beat];
    const experience = this.experience;

    experience.ledDisplay.clearPixels();

    // BEAT COUNT FROM 0-7

    let cnt = 0;
    for (let i = 1; i < 32; i += 4) {
      if (!this.isPlacing[cnt]) {
        const playerColor = '0x' + playerColors[cnt];

        /// color grid
        experience.ledDisplay.line(i, playerColor);

        if (i + 1 < 32)
          experience.ledDisplay.line(i + 1, playerColor);
      } /*else {
        /// white grid
        experience.ledDisplay.line(i, "0x808080");

        if (i + 1 < 32)
          experience.ledDisplay.line(i + 1, "0x808080");
      }
      */
      cnt++;
    }

    // BEAT SELECTOR
    experience.ledDisplay.segment(beat, "0xFFFBCB");

    if (beat === 0)
      console.log("P P P B B B B B B M M M M M M M M M M M M -", measure);

    // make sure that this LED display doesn't interfere with place blinker
    if (!this.isPlacing[beat]) {
      let str = "";

      for (let i = 0; i < states.length; i++) {
        const state = states[i];
        let sub = '  ';

        if (state === 1)
          sub = String.fromCharCode(0x25EF) + ' ';
        else
          sub = '. ';

        str += sub;
      }

      console.log(str);
    } else {
      console.log("- - - - - - - - - - - - - - - - - - - - -");
    }

    /// BLINK NEWCOMMERS


    for (let i = 0; i < numBeats; i++) {
      const isPlacing = this.isPlacing[i];

      if (isPlacing) {
        if (beat <= numBeats / 2) {
          const pC = '0x' + playerColors[cnt];
          experience.ledDisplay.segment(i, pC);
        }
      }
    }
    
    experience.ledDisplay.redraw();

  }

  onSwitchNote(step, note, state) {
    const experience = this.experience;
    experience.broadcast('barrel', null, 'switchNote', step, note, state);
    this.setNoteState(step, note, state);
  }
}
