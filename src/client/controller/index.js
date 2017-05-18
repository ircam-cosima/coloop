// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import serviceViews from '../shared/serviceViews';

// launch application when document is fully loaded
window.addEventListener('load', () => {
  // initialize the client with configuration received
  // from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const config = Object.assign({ appContainer: '#container' }, window.soundworksConfig);
  soundworks.client.init(config.clientType, config);
  // configure views for the services
  soundworks.client.setServiceInstanciationHook((id, instance) => {
    if (serviceViews.has(id))
      instance.view = serviceViews.get(id, config);
  });

  const controller = new soundworks.ControllerExperience();

  controller.setGuiOptions('outputGain0', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('outputGain1', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('outputGain2', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('outputGain3', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('outputGain4', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('outputGain5', {
    type: 'slider',
    size: 'large',
  });
  
  controller.setGuiOptions('outputGain6', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('outputGain7', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('wooferGain', {
    type: 'slider',
    size: 'large',
  });

  controller.setGuiOptions('wooferCutoff', {
    type: 'slider',
    size: 'large',
  });


  soundworks.client.start();
});
