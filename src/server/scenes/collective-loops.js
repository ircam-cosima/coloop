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

    this.onTempoChange = this.onTempoChange.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);
    this.onClear = this.onClear.bind(this);

    this.metronome = new Metronome(experience.scheduler, experience.metricScheduler, numSteps, numSteps, this.onMetroBeat);
  }

  enter() {
    const experience = this.experience;

    experience.sharedParams.addParamListener('tempo', this.onTempoChange);
    experience.sharedParams.addParamListener('clear', this.onClear);

    this.metronome.start();

    for (let client of experience.clients)
      this.clientEnter(client);
  }

  exit() {
    const experience = this.experience;

    experience.sharedParams.removeParamListener('tempo', this.onTempoChange);
    experience.sharedParams.removeParamListener('clear', this.onClear);

    this.metronome.stop();

    for (let client of experience.clients)
      this.clientExit(client);

    this.resetAllStepStates();
  }

  clientEnter(client) {
    this.experience.receive(client, 'switchNote', this.onSwitchNote);

    this.isPlacing[client.index] = true;
    this.placer.start(client, () => {
      this.isPlacing[client.index] = false;
    });
  }

  clientExit(client) {
    this.resetStepStates(client.index);
    this.experience.stopReceiving(client, 'switchNote', this.onSwitchNote);

    this.placer.stop(client);
    this.isPlacing[client.index] = false;
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

  onTempoChange(tempo) {
    if (this.metronome.master) {
      this.metronome.stop();
      this.metronome.start();
    }
  }

  onMetroBeat(measure, beat) {
    const states = this.stepStates[beat];
    const isPlacing = this.isPlacing[beat];

    // control LED display
    if (beat === 0)
      console.log("P P P B B B B B B M M M M M M M M M M M M -", measure);

    // make sure that this LED display doesn't interfere with place blinker
    if (!isPlacing) {
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

  onClear() {
    this.resetAllStepStates();
  }
}
