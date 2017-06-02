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
    const numNotes = config.playerNotes.length;

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

  resetAllStepStates() {
    for (let i = 0; i < this.stepStates.length; i++)
      this.resetStepStates(i);
  }

  setNoteState(step, note, state) {
    const states = this.stepStates[step];
    states[note] = state;
  }

  setTempo(tempo) {
    if (this.metronome.master) {
      this.metronome.stop();
      this.metronome.start();
    }
  }

  clear() {
    this.resetAllStepStates();
  }

  onMetroBeat(measure, beat) {
    //    console.log("BEATS", beat);
    const states = this.stepStates[beat];

    const isPlacing = this.isPlacing[beat];
    const experience = this.experience;
  

    let colors = ["0xFF0000", "0x00FF55", "0x023EFF", "0xFFFF00", "0xD802FF", "0x00FFF5", "0xFF0279", "0xFF9102"];

    experience.ledDisplay.clearPixels();

    // BEAT COUNT FROM 0-7
    let cnt = 0;
    for (let i = 1; i < 32; i += 4) {

      if (this.isPlacing[cnt] === false) {
        /// color grid
        experience.ledDisplay.line(i, colors[cnt]);
        if (i + 1 < 32)
          experience.ledDisplay.line(i + 1, colors[cnt]);
      } else {
        /// white grid
        experience.ledDisplay.line(i, "0x808080");
        if (i + 1 < 32)
          experience.ledDisplay.line(i + 1, "0x808080");
      }
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
        if (!(beat > numBeats / 2))
          experience.ledDisplay.segment(i, colors[i]);
       
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
