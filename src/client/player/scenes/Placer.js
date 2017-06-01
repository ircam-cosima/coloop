import * as soundworks from 'soundworks/client';
import placerConfig from '../../../shared/placer-config';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const TimeEngine = soundworks.audio.TimeEngine;

class Renderer extends soundworks.Canvas2dRenderer {
  constructor() {
    super(0);

    this.state = false;
    this.color = placerConfig[client.index].color;
  }

  init() {}

  update(dt) {}

  render(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.state ? this.color : '#000000';
    ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fill();
    ctx.restore();
  }

  blink(state) {
    this.state = state;
  }
}

const template = `
  <canvas class="background flex-middle"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-middle">
    <p class="user-instruction">Please take your place and touch the screen to continue...</p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

export default class Placer {
  constructor(experience) {
    this.experience = experience;

    this.renderer = new Renderer();
    this.callback = null;
    this.audioOutput = experience.audioOutput;

    this.onTouchStart = this.onTouchStart.bind(this);
  }

  start(callback) {
    this.callback = callback;

    const experience = this.experience;
    experience.view.model = {};
    experience.view.template = template;
    experience.view.render();

    experience.view.addRenderer(this.renderer);
    experience.surface.addListener('touchstart', this.onTouchStart);
  }

  stop() {
    if (this.callback) {
      this.callback = null;

      const experience = this.experience;
      experience.view.removeRenderer(this.renderer);
      experience.surface.removeListener('touchstart', this.onTouchStart);
    }
  }

  blink(state) {
    this.renderer.blink(state);
  }

  onTouchStart(id, normX, normY) {
    const callback = this.callback;
    this.stop();

    const experience = this.experience;
    experience.send('placerReady');

    callback();
  }
}
