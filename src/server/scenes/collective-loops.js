import Metronome from '../Metronome';
import Placer from './Placer';

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

    if(this.isPlacing[clientIndex]) {
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
    const states = this.stepStates[beat];

    // control LED display
    for(let i = 0; i < this.stepStates.length; i++) {
      const isPlacing = this.isPlacing[i];

      if(isPlacing)
        this.placer.blink(i, ((beat / 2) % 2) === 0);
    }

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
  }

  onSwitchNote(step, note, state) {
    const experience = this.experience;
    experience.broadcast('barrel', null, 'switchNote', step, note, state);
    this.setNoteState(step, note, state);
  }
}
