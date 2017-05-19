import * as soundworks from 'soundworks/client';
import { decibelToLinear } from 'soundworks/utils/math';
import sceneConfig from '../../shared/scenes-config';
import SceneCo909 from './scenes/co-909';
const audioContext = soundworks.audioContext;

const sceneCtors = {
  'co-909': SceneCo909,
};

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="flex-center">
      <p class="big">Barrel</p>
    </div>
  </div>
`;

const numOutputChannels = 8;

export default class BarrelExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'], showDialog: false });

    this.sharedParams = this.require('shared-params');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: sceneConfig,
    });

    this.metricScheduler = this.require('metric-scheduler');

    this.scenes = {};

    this.outputBusses = [null, null, null, null, null, null, null, null]; // 8 output channels (array of gain nodes)
    this.crossFilters = [null, null, null, null, null, null, null, null]; // 8 channel cross-over filters (array of biquad filter nodes)
    this.wooferBuss = null; // bass woofer gain node
    this.wooferGain = 1; // bass woofer gain (linear amplitude factor)
    this.delay = 0.02;
  }

  start() {
    super.start();

    this.initAudio(2); // init audio outputs for an interface of the given number of channels
    this.initParams();
    this.initScenes();

    this.view = new soundworks.View(template, {}, {}, { id: 'barrel' });
    this.show();

    this.scenes['co-909'].enter();
  }

  initAudio(numAudioOutputs = 2) {
    const channelMerger = audioContext.createChannelMerger(numOutputChannels);
    const bassWoofer = audioContext.createGain();

    for (let i = 0; i < numOutputChannels; i++) {
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
    for (let i = 0; i < numOutputChannels; i++)
      bassWoofer.connect(channelMerger, 0, i);

    this.wooferBuss = bassWoofer;
    this.setWooferGain(0); // set default woofer gain to 0 dB

    audioContext.destination.channelCount = numAudioOutputs;
    let channelDestination = audioContext.destination;

    if (numAudioOutputs < numOutputChannels) {
      const splitter = audioContext.createChannelSplitter(numOutputChannels);
      const outputMerger = audioContext.createChannelMerger(numAudioOutputs);

      audioContext.destination.channelCount = numAudioOutputs;
      outputMerger.connect(audioContext.destination);
      channelMerger.connect(splitter);

      for (let i = 0; i < numOutputChannels; i++)
        splitter.connect(outputMerger, i, i % numAudioOutputs);

      channelDestination = splitter;
    }

    channelMerger.connect(channelDestination);
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
    this.sharedParams.addParamListener('barrelDelay', (value) => this.setDelay(value));
  }

  initScenes() {
    const sceneConfig = this.audioBufferManager.data;

    for (let scene in sceneCtors) {
      const ctor = sceneCtors[scene];
      const config = sceneConfig[scene];

      if (config)
        this.scenes[scene] = new ctor(this, config);
      else
        throw new Error(`Cannot find config for scene '${scene}'`);
    }
  }

  setOutputGain(index, value) {
    this.outputBusses[index].gain.value = decibelToLinear(value);
  }

  setWooferGain(value) {
    this.wooferBuss.gain.value = decibelToLinear(value) / numOutputChannels;
  }

  setWooferCutoff(value) {
    for (let i = 0; i < numOutputChannels; i++)
      this.crossFilters[i].frequency.value = value;
  }

  setDelay(value) {
    this.delay = value;
  }
}
