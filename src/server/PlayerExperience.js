import { Experience } from 'soundworks/server';
import sceneConfig from '../shared/scenes-config';
import Scheduler from './Scheduler';
import LedDisplay from './LedDisplay';
import SceneOff from './scenes/off';
import SceneCo909 from './scenes/co-909';
import SceneCollectiveLoops from './scenes/collective-loops';
import SceneCoMix from './scenes/co-mix';

const sceneCtors = {
  'off': SceneOff,
  'co-909': SceneCo909,
  'collective-loops': SceneCollectiveLoops,
  'co-mix': SceneCoMix,
};

export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // client/server services
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.syncScheduler = this.require('sync-scheduler');
    this.metricScheduler = this.require('metric-scheduler', { tempo: 120, tempoUnit: 1/4 });
    this.sync = this.require('sync');

    this.scheduler = null;
    this.scenes = {};
    this.currentScene = null;

    this.onTempoChange = this.onTempoChange.bind(this);
    this.onSceneChange = this.onSceneChange.bind(this);
    this.onTemperature = this.onTemperature.bind(this);
  }

  start() {
    this.scheduler = new Scheduler(this.sync);

    this.ledDisplay = new LedDisplay();
    this.ledDisplay.connect('/dev/tty.wchusbserial1410', () => {
      this.ledDisplay.addListener('temperature', this.onTemperature);
      this.ledDisplay.requestTemperature();
    });

    this.initScenes();
    this.currentScene.enter();

    this.sharedParams.addParamListener('tempo', this.onTempoChange);
    this.sharedParams.addParamListener('scene', this.onSceneChange);
  }

  enter(client) {
    super.enter(client);

    this.currentScene.clientEnter(client);

    this.broadcast('barrel', null, 'connectClient', client.index);
    this.sharedParams.update('numPlayers', this.clients.length);
  }

  exit(client) {
    super.exit(client);

    this.currentScene.clientExit(client);

    this.broadcast('barrel', null, 'disconnectClient', client.index);
    this.sharedParams.update('numPlayers', this.clients.length);
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

  onTempoChange(tempo) {
    const syncTime = this.metricScheduler.syncTime;
    const metricPosition = this.metricScheduler.getMetricPositionAtSyncTime(syncTime);

    this.metricScheduler.sync(syncTime, metricPosition, tempo, 1/4, 'tempoChange');
  }

  onSceneChange(value) {
    this.currentScene.exit();
    this.currentScene = this.scenes[value];
    this.currentScene.enter();
  }

  onTemperature(data) {
    console.log('temperature:', data);
    this.sharedParams.update('temperature', data);
  }
}
