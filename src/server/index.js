import 'source-map-support/register'; // enable sourcemaps in node
import path from 'path';
import { server, ControllerExperience } from 'soundworks/server';
import BarrelExperience from './BarrelExperience';
import PlayerExperience from './PlayerExperience';

const configName = process.env.ENV || 'default';
const configPath = path.join(__dirname, 'config', configName);
let config = null;

try {
  config = require(configPath).default;
} catch(err) {
  console.error(`Invalid ENV "${configName}", file "${configPath}.js" not found`);
  process.exit(1);
}

process.env.NODE_ENV = config.env;

server.init(config);

server.setClientConfigDefinition((clientType, config, httpRequest) => {
  return {
    clientType: clientType,
    env: config.env,
    socketIO: config.socketIO,
    appName: config.appName,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,
  };
});

const sharedParams = server.require('shared-params');
sharedParams.addText('numPlayers', 'num players', 0, ['controller']);
sharedParams.addNumber('outputGain0', 'output 0 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('outputGain1', 'output 1 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('outputGain2', 'output 2 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('outputGain3', 'output 3 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('outputGain4', 'output 4 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('outputGain5', 'output 5 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('outputGain6', 'output 6 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('outputGain7', 'output 7 gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('wooferGain', 'woofer gain', -40, 20, 1, 0, ['controller', 'barrel']);
sharedParams.addNumber('wooferCutoff', 'woofer cutoff', 50, 500, 5, 250, ['controller', 'barrel']);
sharedParams.addNumber('tempo', 'tempo', 60, 240, 5, 120, ['controller']);
sharedParams.addTrigger('clear', 'clear');

const controllerExperience = new ControllerExperience('controller');
const barrelExperience = new BarrelExperience('barrel');
const playerExperience = new PlayerExperience('player');

server.start();
