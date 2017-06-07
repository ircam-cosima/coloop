import { Experience } from 'soundworks/server';
import sceneConfig from '../shared/scenes-config';
import Scheduler from './Scheduler';
import LedDisplay from './LedDisplay';
import SceneOff from './scenes/off';
import SceneCo909 from './scenes/co-909';
import SceneCollectiveLoops from './scenes/collective-loops';
import SceneCoMix from './scenes/co-mix';
import SceneWwryR from './scenes/wwry-r';

const sceneCtors = {
  'off': SceneOff,
  'co-909': SceneCo909,
  'collective-loops': SceneCollectiveLoops,
  'co-mix': SceneCoMix,
  'wwry-r': SceneWwryR,
};

export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // client/server services
    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.syncScheduler = this.require('sync-scheduler');
    this.metricScheduler = this.require('metric-scheduler', { tempo: 120, tempoUnit: 1 / 4 });
    this.sync = this.require('sync');

    this.scheduler = null;
    this.scenes = {};
    this.currentScene = null;
    this.tempo = 120;

    this.onSceneChange = this.onSceneChange.bind(this);
    this.onTempoChange = this.onTempoChange.bind(this);
    this.onClear = this.onClear.bind(this);
    this.onTemperature = this.onTemperature.bind(this);
    this.onButtonIncremented = this.onButtonIncremented.bind(this);
    this.onButtonDecremented = this.onButtonDecremented.bind(this);
  }

  start() {
    this.scheduler = new Scheduler(this.sync);

    this.ledDisplay = new LedDisplay();
    this.ledDisplay.connect(null, () => {
      // null means automatic port search, otherwise put something like : /dev/tty.wchusbserial1420

      this.ledDisplay.addListener('temperature', this.onTemperature);
      this.ledDisplay.addListener('buttonIncremented', this.onButtonIncremented);
      this.ledDisplay.addListener('buttonDecremented', this.onButtonDecremented);

      // we need to wait that arduino start his processes and starts to listen
      // this is not beautiful way to do it. Arduino has to send one byte when is ready... todo
      setTimeout(() => { this.ledDisplay.requestTemperature(); }, 2000);

    });

    this.initScenes();

    this.sharedParams.addParamListener('scene', this.onSceneChange);
    this.sharedParams.addParamListener('tempo', this.onTempoChange);
    this.sharedParams.addParamListener('clear', this.onClear);
  }

  enterCurrentScene() {
    this.currentScene.enter();

    for (let client of this.clients)
      this.currentScene.clientEnter(client);
  }

  exitCurrentScene() {
    for (let client of this.clients)
      this.currentScene.clientExit(client);

    this.currentScene.exit();
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
    this.enterCurrentScene();
  }

  enableTempoChange(value) {
    if (value !== this.tempoChangeEnabled) {
      this.tempoChangeEnabled = value;

      if (value)
        this.sharedParams.addParamListener('tempo', this.onTempoChange);
      else
        this.sharedParams.removeParamListener('tempo', this.onTempoChange);
    }
  }

  onSceneChange(value) {
    // get temperature on each change of scenario
    try {
      this.ledDisplay.requestTemperature();
    } catch (e) {
      console.log("will get temperature later");
    }
    this.exitCurrentScene();
    this.currentScene = this.scenes[value];
    this.enterCurrentScene();
  }

  onTempoChange(tempo) {
    if (this.currentScene.setTempo)
      this.currentScene.setTempo(tempo);

    this.tempo = tempo;

    const syncTime = this.metricScheduler.syncTime;
    const metricPosition = this.metricScheduler.getMetricPositionAtSyncTime(syncTime);
    this.metricScheduler.sync(syncTime, metricPosition, tempo, 1/4, 'tempoChange');
  }

  onClear() {
    if (this.currentScene.clear)
      this.currentScene.clear();
  }

  onTemperature(data) {
    this.sharedParams.update('temperature', data);
  }

  onButtonIncremented(data) {
    if(this.tempoChangeEnabled)
      this.sharedParams.update('tempo', this.tempo + 1);
  }

  onButtonDecremented(data) {
    if(this.tempoChangeEnabled)
      this.sharedParams.update('tempo', this.tempo - 1);
  }
}
