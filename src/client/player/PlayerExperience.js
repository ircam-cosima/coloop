import * as soundworks from 'soundworks/client';
import sceneConfig from '../../shared/scenes-config';
import SceneCo909 from './scenes/co-909';
const audioContext = soundworks.audioContext;

const sceneCtors = {
  'co-909': SceneCo909,
};

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-center"></div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'] });
    // this.motionInput = this.require('motion-input', {
    //   descriptors: ['accelerationIncludingGravity']
    // });

    this.scenes = {};

    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: sceneConfig,
    });

    this.metricScheduler = this.require('metric-scheduler');
    this.surface = null;
  }

  start() {
    super.start();

    this.initAudio();
    this.initScenes();

    this.view = new soundworks.CanvasView(template, {}, {}, {
      id: this.id,
      preservePixelRatio: true,
    });

    this.show().then(() => {
      this.surface = new soundworks.TouchSurface(this.view.$el);
      this.scenes['co-909'].enter();
    });
  }

  // initMotion() {
  //   if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
  //     this.motionInput.addListener('accelerationIncludingGravity', (data) => {
  //       const accX = data[0];
  //       const accY = data[1];
  //       const accZ = data[2];
  //       const mag = Math.sqrt(accX * accX + accY * accY + accZ * accZ);

  //       /* ??? */
  //     });
  //   }
  // }

  initAudio() {
    this.audioOutput = audioContext.createGain();
    this.audioOutput.connect(audioContext.destination);
    this.audioOutput.gain.value = 1;
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
}
