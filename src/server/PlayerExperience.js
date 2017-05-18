import { Experience } from 'soundworks/server';
import machineDefinition from '../shared/machine-definition';
import Scheduler from './Scheduler';
import Metronome from './Metronome';

export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // client/server services
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.metricScheduler = this.require('metric-scheduler', { tempo: 120, tempoUnit: 1 / 4 });
    this.sync = this.require('sync');

    this.instrumentSequences = new Array(machineDefinition.instruments.length);
    for (let i = 0; i < this.instrumentSequences.length; i++) {
      this.instrumentSequences[i] = new Array(machineDefinition.numSteps);
      this.resetInstrumentSequence(i);
    }

    this.scheduler = null;
    this.metronome = null;
  }

  start() {
    // hack forgotten intitialization of the metric scheduler (sorry, fixed for next release)
    this.metricScheduler._metricSpeed = 0.5; // tempo: 120, tempoUnit: 1/4

    this.scheduler = new Scheduler(this.sync);
    this.metronome = new Metronome(this.scheduler, this.metricScheduler, 16, 16, (measure, beat) => {
      const instrumentSequences = this.instrumentSequences;

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

      console.log(str);
    });

    this.metronome.start();

    this.sharedParams.addParamListener('tempo', (tempo) => {
      const syncTime = this.metricScheduler.syncTime;
      const metricPosition = this.metricScheduler.getMetricPositionAtSyncTime(syncTime);

      this.metricScheduler.sync(syncTime, metricPosition, tempo, 1 / 4, 'tempoChange');

      this.metronome.stop();
      this.metronome.start();
    });

    this.sharedParams.addParamListener('clear', () => {
      this.broadcast(null, null, 'clearAllNotes');
      this.resetAllInstrumentSequences();
    });
  }

  enter(client) {
    super.enter(client);

    this.receive(client, 'switchNote', (beat, state) => {
      const instrument = client.index;
      this.broadcast('barrel', null, 'switchNote', instrument, beat, state);
      this.setNoteState(instrument, beat, state);
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
