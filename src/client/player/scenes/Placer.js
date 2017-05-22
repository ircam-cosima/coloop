import * as soundworks from 'soundworks/client';
import placerConfig from '../../../shared/placer-config';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const TimeEngine = soundworks.audio.TimeEngine;

class Blinker extends TimeEngine {
  constructor(scheduler, renderer) {
    super();

    this.scheduler = scheduler;
    this.renderer = renderer;

    const place = placerConfig[client.index];
    this.place = place.color;
    this.period = place.period;
    this.state = false;
  }

  advanceTime(time) {
    this.renderer.blink(this.state);
    this.state = !this.state;
    return time + this.period;
  }

  start() {
    const time = this.scheduler.currentTime;
    const period = this.period;
    const nextIndex = Math.ceil(time / period);
    const startTime = nextIndex * period;
    this.state = ((nextIndex % 2) !== 0);
    this.scheduler.add(this, startTime);
  }

  stop() {
    this.scheduler.remove(this);
  }
}

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
    ctx.closePath();
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
    this.blinker = new Blinker(experience.syncScheduler, this.renderer);
    this.callback = null;
    this.audioOutput = experience.audioOutput;

    this.onTouchStart = this.onTouchStart.bind(this);
  }

  start(callback) {
    this.callback = callback;

    this.blinker.start();

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

      this.blinker.stop();

      const experience = this.experience;
      experience.view.removeRenderer(this.renderer);
      experience.surface.removeListener('touchstart', this.onTouchStart);
    }
  }

  onTouchStart(id, normX, normY) {
    const callback = this.callback;
    this.stop();
    this.experience.send('placerReady');
    callback();
  }
}
