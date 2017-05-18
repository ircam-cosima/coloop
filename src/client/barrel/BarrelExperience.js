import * as soundworks from 'soundworks/client';
import machineDefinition from '../../shared/machine-definition';

function dbToLin(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
}

const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-center">
      <p class="big"><%= title %></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

const model = { title: `Barrel` };

const numOutputChannels = 8;

export default class BarrelExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'], showDisplay: false });

    this.sharedParams = this.require('shared-params');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: machineDefinition.instruments,
    });

    this.metricScheduler = this.require('metric-scheduler');

    this.instrumentSequences = new Array(machineDefinition.instruments.length);
    for (let i = 0; i < this.instrumentSequences.length; i++) {
      this.instrumentSequences[i] = new Array(machineDefinition.numSteps);
      this.resetInstrumentSequence(i);
    }

    this.outputBusses = [null, null, null, null, null, null, null, null]; // 8 output channels (array of gain nodes)
    this.crossFilters = [null, null, null, null, null, null, null, null]; // 8 channel cross-over filters (array of biquad filter nodes)
    this.wooferBuss = null; // bass woofer gain node
    this.wooferGain = 1; // bass woofer gain (linear amplitude factor)
  }

  start() {
    super.start();

    this.initAudio(2); // init audio outputs for an interface of the given number of channels
    this.initParams();

    this.view = new soundworks.CanvasView(template, model, {}, {
      id: this.id,
      preservePixelRatio: true,
    });

    this.show().then(() => {
      this.receive('connectInstrument', (instrument) => {});
      this.receive('disconnectInstrument', (instrument) => this.resetInstrumentSequence(instrument));

      this.receive('switchNote', (instrument, beat, state) => this.setNoteState(instrument, beat, state));
      this.receive('clearAllNotes', () => this.resetAllInstrumentSequences());

      this.instruments = this.audioBufferManager.data;

      const metrofunction = (measureCount, beatCount) => {
        this.playBeat(beatCount);
      };

      this.metricScheduler.addMetronome(metrofunction, 16, 16);
    });
  }

  initAudio(numAudioOutputs = 2) {
    const channelMerger = audioContext.createChannelMerger(numOutputChannels);
    const bassWoofer = audioContext.createGain();

    for(let i = 0; i < numOutputChannels; i++) {
      const channel = audioContext.createGain();
      const lowpass = audioContext.createBiquadFilter();
      const inverter = audioContext.createGain();

      lowpass.type = 'lowpass';
      lowpass.frequency.value = 250; // set default woofer cutoff frequency to 250 Hz
      inverter.gain.value = -1;

      // connect 
      channel.connect(lowpass);

      // connect high pass to single output channel, 
      // highpass = channel - lowpass(channel) = channel + inverter(lowpass(channel))
      channel.connect(channelMerger, 0, i);
      lowpass.connect(inverter);
      inverter.connect(channelMerger, 0, i);

      // connect low pass (virtual) to bass woofer
      lowpass.connect(bassWoofer);

      this.outputBusses[i] = channel;
      this.crossFilters[i] = lowpass;
    }

    // connect bass woofer to all output channels
    for(let i = 0; i < numOutputChannels; i++)
      bassWoofer.connect(channelMerger, 0, i);

    this.wooferBuss = bassWoofer;
    this.setWooferGain(0); // set default woofer gain to 0 dB

    if(numAudioOutputs >= numOutputChannels) {
      audioContext.destination.channelCount = numAudioOutputs;
      channelMerger.connect(audioContext.destination);
    } else {
      audioContext.destination.channelCount = numAudioOutputs;
      const splitter = audioContext.createChannelSplitter(numOutputChannels);
      const outputMerger = audioContext.createChannelMerger(numAudioOutputs);

      audioContext.destination.channelCount = numAudioOutputs;
      outputMerger.connect(audioContext.destination);
      channelMerger.connect(splitter);

      for (let i = 0; i < numOutputChannels; i++)
        splitter.connect(outputMerger, i, i % numAudioOutputs);
    }
  }

  initParams() {
    this.sharedParams.addParamListener('outputGain0', (value) => this.setOutputGain(0, value));
    this.sharedParams.addParamListener('outputGain1', (value) => this.setOutputGain(1, value));
    this.sharedParams.addParamListener('outputGain2', (value) => this.setOutputGain(2, value));
    this.sharedParams.addParamListener('outputGain3', (value) => this.setOutputGain(3, value));
    this.sharedParams.addParamListener('outputGain4', (value) => this.setOutputGain(4, value));
    this.sharedParams.addParamListener('outputGain5', (value) => this.setOutputGain(5, value));
    this.sharedParams.addParamListener('outputGain6', (value) => this.setOutputGain(6, value));
    this.sharedParams.addParamListener('outputGain7', (value) => this.setOutputGain(7, value));
    this.sharedParams.addParamListener('wooferGain', (value) => this.setWooferGain(value));
    this.sharedParams.addParamListener('wooferCutoff', (value) => this.setWooferCutoff(value));
  }

  setOutputGain(index, value) {
    this.outputBusses[index].gain.value = dbToLin(value);
  }

  setWooferCutoff(value) {
    for(let i = 0; i < numOutputChannels; i++)
      this.crossFilters[i].frequency.value = value;
  }

  setWooferGain(value) {
    this.wooferBuss.gain.value = dbToLin(value) / numOutputChannels;
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

  playBeat(beat) {
    const time = audioScheduler.currentTime;

    for (let i = 0; i < this.instrumentSequences.length; i++) {
      const instrument = this.instruments[i];
      const sequence = this.instrumentSequences[i];
      const state = sequence[beat];

      if (state > 0) {
        const src = audioContext.createBufferSource();
        src.connect(this.outputBusses[i]);
        src.buffer = (state === 1) ? instrument.low : instrument.high;
        src.start(time);
      }
    }
  }
}
