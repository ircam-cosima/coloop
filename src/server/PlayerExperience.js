import { Experience } from 'soundworks/server';
import sceneConfig from '../shared/scenes-config';
import Scheduler from './Scheduler';
import SceneOff from './scenes/off';
import SceneCo909 from './scenes/co-909';
import SceneCollectiveLoops from './scenes/collective-loops';

const sceneCtors = {
  'off': SceneOff,
  'co-909': SceneCo909,
  'collective-loops': SceneCollectiveLoops,
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
  }

  start() {
    this.scheduler = new Scheduler(this.sync);

    this.initScenes();
    this.currentScene.enter();

    this.metricScheduler._metricSpeed = 0.5; // hack forgotten intitialization (tempo: 120, tempoUnit: 1/4) of the metric scheduler (fixed for next soundworks release)
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
}
