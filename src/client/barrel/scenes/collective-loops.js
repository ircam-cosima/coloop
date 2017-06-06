import * as soundworks from 'soundworks/client';
import { decibelToLinear } from 'soundworks/utils/math';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneCollectiveLoops {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.notes = null;

    const numSteps = config.numSteps;
    const numNotes = config.notes.length;

    this.stepStates = new Array(numSteps);

    for (let i = 0; i < numSteps; i++) {
      this.stepStates[i] = new Array(numNotes);
      this.resetStepStates(i);
    }

    this.outputBusses = experience.outputBusses;

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onSwitchNote = this.onSwitchNote.bind(this);
  }

  clientEnter(index) {}

  clientExit(index) {
    this.resetStepStates(index);
  }

  enterScene() {
    const experience = this.experience;
    const numSteps = this.stepStates.length;
    experience.metricScheduler.addMetronome(this.onMetroBeat, numSteps, numSteps);
    experience.receive('switchNote', this.onSwitchNote);
  }

  enter() {
    const experience = this.experience;

    if (this.notes) {
      this.enterScene();
    } else {
      const noteConfig = this.config.notes;
      experience.audioBufferManager.loadFiles(noteConfig).then((notes) => {
        this.notes = notes;
        this.enterScene();
      });
    }
  }

  exit() {
    const experience = this.experience;
    experience.metricScheduler.removeMetronome(this.onMetroBeat);
    experience.stopReceiving('switchNote', this.onSwitchNote);
  }

  resetStepStates(step) {
    const states = this.stepStates[step];

    for (let i = 0; i < states.length; i++) {
      states[i] = 0;
    }
  }

  clear() {
    for (let i = 0; i < this.stepStates.length; i++)
      this.resetStepStates(i);
  }

  onMetroBeat(measure, beat) {
    const time = audioScheduler.currentTime;
    const notes = this.notes;
    const states = this.stepStates[beat];
    const output = this.outputBusses[beat];

    for (let i = 0; i < states.length; i++) {
      const note = notes[i];
      const state = states[i];

      if (state > 0) {
        const gain = audioContext.createGain();
        gain.connect(output);
        gain.gain.value = decibelToLinear(note.gain);

        const src = audioContext.createBufferSource();
        src.connect(gain);
        src.buffer = note.buffer;
        src.start(time);
      }
    }
  }

  onSwitchNote(step, note, state) {
    const states = this.stepStates[step];
    states[note] = state;
  }
}
