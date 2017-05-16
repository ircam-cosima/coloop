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
sharedParams.addTrigger('clear', 'clear');

const controllerExperience = new ControllerExperience('controller');
const barrelExperience = new BarrelExperience('barrel');
const playerExperience = new PlayerExperience('player');

server.start();
