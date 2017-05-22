import * as soundworks from 'soundworks/client';
import sceneConfig from '../../shared/scenes-config';
import SceneOff from './scenes/off';
import SceneCo909 from './scenes/co-909';
import SceneCollectiveLoops from './scenes/collective-loops';
const audioContext = soundworks.audioContext;

const sceneCtors = {
  'off': SceneOff,
  'co-909': SceneCo909,
  'collective-loops': SceneCollectiveLoops,
};

const template = `
  <canvas class="background flex-middle"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-middle"></div>
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
    this.currentScene = null;

    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager', { assetsDomain: assetsDomain });

    this.syncScheduler = this.require('sync-scheduler');
    this.metricScheduler = this.require('metric-scheduler');
    this.surface = null;

    this.onSceneChange = this.onSceneChange.bind(this);
  }

  start() {
    super.start();

    this.view = new soundworks.CanvasView(template, {}, {}, {
      id: this.id,
      ratios: {
        '.section-top': 0,
        '.section-center': 1,
        '.section-bottom': 0,
      },
    });

    this.show().then(() => {
      this.surface = new soundworks.TouchSurface(this.view.$el);

      this.initAudio();
      this.initScenes();
      this.currentScene.enter();

      this.sharedParams.addParamListener('scene', this.onSceneChange);
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

  initSurface() {
    const surface = new soundworks.TouchSurface(this.view.$el);
  }

  initAudio() {
    this.audioOutput = audioContext.createGain();
    this.audioOutput.connect(audioContext.destination);
    this.audioOutput.gain.value = 1;
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
  }

  onSceneChange(value) {
    this.currentScene.exit();
    this.currentScene = this.scenes[value];
    this.currentScene.enter();
  }
}
