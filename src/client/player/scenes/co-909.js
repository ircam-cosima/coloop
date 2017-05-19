import * as soundworks from 'soundworks/client';
import { Canvas2dRenderer } from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

class Renderer extends Canvas2dRenderer {
  constructor(states) {
    super(0);

    this.states = states;
    this.highlight = undefined;
  }

  init() {

  }

  update(dt) {

  }

  render(ctx) {
    ctx.save();

    const states = this.states;
    const numStates = states.length;
    const yMargin = 6;
    const stepHeight = this.canvasHeight / numStates;
    const rectHeight = stepHeight - 2 * yMargin;
    const xMargin = (this.canvasWidth - rectHeight) / 2;
    const rectWidth = this.canvasWidth - 2 * xMargin;
    const x = xMargin;
    let y = yMargin;

    for (let i = 0; i < numStates; i++) {
      let state = states[i];

      if (i === this.highlight)
        state = 3;

      ctx.beginPath();
      ctx.globalAlpha = 1;

      switch (state) {
        case 0:
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = "#ffffff";
          break;

        case 1:
          ctx.fillStyle = '#3f3f3f';
          ctx.strokeStyle = "#ffffff";
          break;

        case 2:
          ctx.fillStyle = '#7f7f7f';
          ctx.strokeStyle = "#ffffff";
          break;

        case 3:
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = "#ffffff";
          break;
      }

      ctx.rect(x, y, rectWidth, rectHeight);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      y += stepHeight;
    }

    ctx.restore();
  }

  setHighlight(index) {
    this.highlight = index;
  }
}

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-center">
      <p class="big"><%= title %></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

export default class Co909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.audioOutput = experience.audioOutput;

    this.instrument = config.instruments[soundworks.client.index];
    this.sequence = new Array(config.numSteps);
    this.resetSequence();

    this.renderer = new Renderer(this.sequence);

    this.onClear = this.onClear.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
  }

  enter() {
    const experience = this.experience;

    experience.view.model = { title: this.instrument.name.toUpperCase() };
    experience.view.template = template;
    experience.view.render();
    experience.view.addRenderer(this.renderer);      
    experience.view.setPreRender(function(ctx, dt, canvasWidth, canvasHeight) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000000';
        ctx.rect(0, 0, canvasWidth, canvasHeight);
        ctx.fill();
        ctx.restore();
      });

    experience.surface.addListener('touchstart', this.onTouchStart);
    experience.metricScheduler.addMetronome(this.onMetroBeat, 16, 16);
    experience.sharedParams.addParamListener('clear', this.onClear);
  }

  exit() {
    const experience = this.experience;
    experience.view.removeRenderer(this.renderer);
    experience.surface.removeListener('touchstart', this.onTouchStart);
    experience.metricScheduler.removeMetronome(this.onMetroBeat);
    experience.sharedParams.removeParamListener('clear', this.onClear);
  }

  resetSequence() {
    for (let i = 0; i < this.sequence.length; i++)
      this.sequence[i] = 0;
  }

  onTouchStart(id, normX, normY) {
    const beat = Math.floor(normY * this.sequence.length);
    let state = (this.sequence[beat] + 1) % 3;
    this.sequence[beat] = state;
    this.experience.send('switchNote', client.index, beat, state);
  }

  onMetroBeat(measureCount, beatCount) {
    this.renderer.setHighlight(beatCount);

    const state = this.sequence[beatCount];

    if (state > 0) {
      const time = audioScheduler.currentTime;
      const src = audioContext.createBufferSource();
      src.connect(this.audioOutput);
      src.buffer = (state === 1) ? this.instrument.low : this.instrument.high;
      src.start(time);
    }
  }

  onClear() {
    this.resetSequence();
  }
}
