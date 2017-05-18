import { Experience } from 'soundworks/server';
import machineDefinition from '../shared/machine-definition';

export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // client/server services
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.metricScheduler = this.require('metric-scheduler', { tempo: 120, tempoUnit: 1/4 });

    this.instrumentSequences = new Array(machineDefinition.instruments.length);
    for (let i = 0; i < this.instrumentSequences.length; i++) {
      this.instrumentSequences[i] = new Array(machineDefinition.numSteps);
      this.resetInstrumentSequence(i);
    }
  }

  start() {
    this.sharedParams.addParamListener('clear', () => {
      this.broadcast(null, null, 'clearAllNotes');
    });
  }

  enter(client) {
    super.enter(client);

    this.receive(client, 'switchNote', (beat, state) => {
      this.broadcast('barrel', null, 'switchNote', client.index, beat, state);
    });

    this.broadcast('barrel', null, 'connectInstrument', client.index);

    this.sharedParams.update('numPlayers', this.clients.length);
  }

  exit(client) {
    super.exit(client);

    this.broadcast('barrel', null, 'disconnectInstrument', client.index);
    this.resetInstrumentSequence(client.index);

    this.sharedParams.update('numPlayers', this.clients.length);
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

  getNoteState(instrument, beat) {
    const sequence = this.instrumentSequences[instrument];
    return sequence[beat] || 0;
  }
}
