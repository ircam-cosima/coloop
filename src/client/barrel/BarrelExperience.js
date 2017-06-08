import * as soundworks from 'soundworks/client';
import { decibelToLinear } from 'soundworks/utils/math';
import sceneConfig from '../../shared/scenes-config';
import SceneOff from './scenes/off';
import SceneCo909 from './scenes/co-909';
import SceneCollectiveLoops from './scenes/collective-loops';
import SceneCoMix from './scenes/co-mix';
import SceneWwryR from './scenes/wwry-r';
const audioContext = soundworks.audioContext;

const sceneCtors = {
  'off': SceneOff,
  'co-909': SceneCo909,
  'collective-loops': SceneCollectiveLoops,
  'co-mix': SceneCoMix,
  'wwry-r': SceneWwryR,
};

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="flex-middle">
      <p class="big">Barrel</p>
    </div>
  </div>
`;

const numOutputChannels = 8; // "virtual" output channels
const maxAudioDestinationChannels = audioContext.destination.maxChannelCount;
const numAudioOutputs = maxAudioDestinationChannels ? Math.min(numOutputChannels, maxAudioDestinationChannels) : 2; // "physical" audio outputs

export default class BarrelExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'], showDialog: false });
    this.sharedParams = this.require('shared-params');
    this.audioBufferManager = this.require('audio-buffer-manager', { assetsDomain: assetsDomain });
    this.metricScheduler = this.require('metric-scheduler');

    this.scenes = {};
    this.currentScene = null;

    this.clients = new Set();

    this.outputBusses = new Array(numOutputChannels); // output channels (array of gain nodes)
    this.crossFilters = new Array(numOutputChannels); // channel cross-over filters (array of biquad filter nodes)
    this.wooferBuss = null; // bass woofer gain node
    this.wooferGain = 1; // bass woofer gain (linear amplitude factor)
    this.delay = 0.02;

    this.onSceneChange = this.onSceneChange.bind(this);
    this.onConnectClient = this.onConnectClient.bind(this);
    this.onDisconnectClient = this.onDisconnectClient.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  start() {
    super.start();

    this.view = new soundworks.View(template, {}, {}, { id: 'barrel' });
    this.show();

    this.initScenes();

    this.initAudio(numAudioOutputs); // init audio outputs for an interface of the given number of channels
    this.initParams();

    this.receive('connectClient', this.onConnectClient);
    this.receive('disconnectClient', this.onDisconnectClient);
    this.sharedParams.addParamListener('clear', this.onClear);
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
    this.sharedParams.addParamListener('scene', this.onSceneChange);
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
    for (let scene in sceneCtors) {
      const ctor = sceneCtors[scene];
      const config = sceneConfig[scene];

      if (config)
        this.scenes[scene] = new ctor(this, config);
      else
        throw new Error(`Cannot find config for scene '${scene}'`);
    }

    this.currentScene = this.scenes.off;
    this.enterCurrentScene();
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

  enterCurrentScene() {
    this.currentScene.enter();

    for (let client of this.clients)
      this.currentScene.clientEnter(client);    
  }

  exitCurrentScene() {
    this.currentScene.exit();

    for (let client of this.clients)
      this.currentScene.clientExit(client);    
  }

  onSceneChange(value) {
    this.exitCurrentScene();
    this.currentScene = this.scenes[value];
    this.enterCurrentScene();
  }

  onConnectClient(index) {
    this.clients.add(index);
    this.currentScene.clientEnter(index);
  }

  onDisconnectClient(index) {
    this.clients.delete(index);
    this.currentScene.clientExit(index);
  }

  onClear(index) {
    if(this.currentScene.clear)
      this.currentScene.clear(index);
  }
}
