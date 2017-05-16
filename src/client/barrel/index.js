// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import BarrelExperience from './BarrelExperience';
import serviceViews from '../shared/serviceViews';

function bootstrap() {
  const config = Object.assign({ appContainer: '#container' }, window.soundworksConfig);
  soundworks.client.init(config.clientType, config);

  soundworks.client.setServiceInstanciationHook((id, instance) => {
    if (serviceViews.has(id))
      instance.view = serviceViews.get(id, config);
  });

  const experience = new BarrelExperience(config.assetsDomain);
  soundworks.client.start();
}

window.addEventListener('load', bootstrap);
