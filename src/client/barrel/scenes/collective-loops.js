import * as soundworks from 'soundworks/client';
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
    this.onDisconnectClient = this.onDisconnectClient.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  enterScene() {
    const experience = this.experience;
    const numSteps = this.stepStates.length;
    experience.metricScheduler.addMetronome(this.onMetroBeat, numSteps, numSteps);
    experience.receive('switchNote', this.onSwitchNote);
    experience.receive('disconnectClient', this.onDisconnectClient);
    experience.sharedParams.addParamListener('clear', this.onClear);    
  }

  enter() {
    const experience = this.experience;

    if(this.notes) {
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
    experience.stopReceiving('disconnectClient', this.onDisconnectClient);
    experience.sharedParams.removeParamListener('clear', this.onClear());
  }

  resetStepStates(step) {
    const states = this.stepStates[step];

    for (let i = 0; i < states.length; i++) {
      states[i] = 0;
    }
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
        const src = audioContext.createBufferSource();
        src.connect(output);
        src.buffer = note.buffer;
        src.start(time);
      }
    }
  }

  onSwitchNote(step, note, state) {
    const states = this.stepStates[step];
    states[note] = state;
  }

  onDisconnectClient(step) {
    this.resetStepStates(step);
  }

  onClear() {
    for (let i = 0; i < this.stepStates.length; i++)
      this.resetStepStates(i);
  }
}
