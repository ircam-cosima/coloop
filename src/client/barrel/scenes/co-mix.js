import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

export default class SceneCoMix {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.notes = null;

    const numSteps = config.numSteps;
    const numNotes = config.barrelNotes.length;

    this.stepStates = new Array(numSteps);

    for (let i = 0; i < numSteps; i++) {
      this.stepStates[i] = new Array(numNotes);
      this.resetStepStates(i);
    }

    this.outputBusses = experience.outputBusses;

    this.onMetroBeat = this.onMetroBeat.bind(this);
    this.onDisconnectClient = this.onDisconnectClient.bind(this);
  }

  enterScene() {
    const experience = this.experience;
    const numSteps = this.stepStates.length;
    experience.metricScheduler.addMetronome(this.onMetroBeat, numSteps, numSteps);
    experience.receive('disconnectClient', this.onDisconnectClient);
  }

  enter() {
    const experience = this.experience;

    if(this.notes) {
      this.enterScene();
    } else {
      const noteConfig = this.config.barrelNotes;
      experience.audioBufferManager.loadFiles(noteConfig).then((notes) => {
        this.notes = notes;
        this.enterScene();        
      });
    }
  }

  exit() {
    const experience = this.experience;
    experience.metricScheduler.removeMetronome(this.onMetroBeat);
    experience.stopReceiving('disconnectClient', this.onDisconnectClient);
  }

  resetStepStates(step) {
    const states = this.stepStates[step];

    for (let i = 0; i < states.length; i++) {
      states[i] = 0;
    }
  }

  onMetroBeat(measure, beat) {
    const time = audioScheduler.currentTime;
  }

  onDisconnectClient(index) {
    this.resetTrack(step);
  }
}
