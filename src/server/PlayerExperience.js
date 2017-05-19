import { Experience } from 'soundworks/server';
import sceneConfig from '../shared/scenes-config';
import Scheduler from './Scheduler';
import SceneCo909 from './scenes/co-909';

const sceneCtors = {
  'co-909': SceneCo909,
};

export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // client/server services
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.metricScheduler = this.require('metric-scheduler', { tempo: 120, tempoUnit: 1 / 4 });
    this.sync = this.require('sync');

    this.scheduler = null;
    this.scenes = {};

    this.onTempoChange = this.onTempoChange.bind(this);
  }

  start() {
    this.scheduler = new Scheduler(this.sync);

    this.initScenes();

    // hack forgotten intitialization of the metric scheduler (sorry, fixed for next release)
    this.metricScheduler._metricSpeed = 0.5; // tempo: 120, tempoUnit: 1/4

    const scene = this.scenes['co-909'];
    this.currentScene = scene;
    scene.enter();
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
  }

  onTempoChange(tempo) {
    const syncTime = this.metricScheduler.syncTime;
    const metricPosition = this.metricScheduler.getMetricPositionAtSyncTime(syncTime);

    this.metricScheduler.sync(syncTime, metricPosition, tempo, 1 / 4, 'tempoChange');
  }
}
