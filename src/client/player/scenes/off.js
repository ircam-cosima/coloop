import * as soundworks from 'soundworks/client';

const template = `
  <canvas class="background flex-middle"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-middle">
      <p class="big"><b>CoLoop</b> Ready</p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

export default class SceneOff {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
  }

  enter() {
    const experience = this.experience;
    experience.view.model = { };
    experience.view.template = template;
    experience.view.render();
  }

  exit() {

  }
}
