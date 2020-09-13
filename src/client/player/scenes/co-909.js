import * as soundworks from 'soundworks/client';
import { decibelToLinear } from 'soundworks/utils/math';
import Placer from './Placer';
import colorConfig from '../../../shared/color-config';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();
const playerColors = colorConfig.players;

function radToDegrees(radians) {
  return radians * 180 / Math.PI;
}

class Renderer extends soundworks.Canvas2dRenderer {
  constructor(states, circleRadius, buttonRadius, color) {
    super(0);

    this.states = states;
    this.circleRadius = circleRadius;
    this.buttonRadius = buttonRadius;
    this.highlight = undefined;
    this.color = color;
  }

  init() {
    const circleRadius = this.circleRadius;

    this.positionXArr = [];
    this.positionYArr = [];

    for (let i = 0; i < this.states.length; i++) {
      const x = circleRadius * Math.cos(Math.PI / 2 - (i * (Math.PI / 8)));
      const y = circleRadius * Math.sin(Math.PI / 2 - (i * (Math.PI / 8)));
      this.positionXArr.push(x);
      this.positionYArr.push(y);
    }
  }

  update(dt) {

  }

  render(ctx) {
    ctx.save();

    const buttonRadius = this.buttonRadius;
    const states = this.states;
    const numSteps = states.length;
    const x0 = this.canvasWidth / 2;
    const y0 = this.canvasHeight / 2;

    for (let i = 0; i < numSteps; i++) {
      const state = states[i];
      let internalCircle = buttonRadius;

      switch (state) {
        case 0:
          if (i === this.highlight) {
            ctx.fillStyle = '#606060';
          } else {
            ctx.fillStyle = '#000000';
          }
          break;

        case 1:
          if (i === this.highlight) {
            ctx.fillStyle = '#FFFFFF';
          } else {
            ctx.fillStyle = this.color;
            internalCircle = buttonRadius / 2;
          }
          break;

        case 2:
          if (i === this.highlight) {
            ctx.fillStyle = '#FFFFFF';
          } else {
            ctx.fillStyle = this.color;
          }
          break;
      }

      ctx.beginPath();
      ctx.ellipse(x0 + this.positionXArr[i], y0 - this.positionYArr[i], internalCircle, internalCircle, 0, 0, 2 * Math.PI);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";

      ctx.beginPath();
      ctx.ellipse(x0 + this.positionXArr[i], y0 - this.positionYArr[i], buttonRadius, buttonRadius, 0, 0, 2 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  setHighlight(index) {
    this.highlight = index;
  }
}

const template = `
  <canvas class="background flex-middle"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-middle">
    <p class="instrument-name"><%= instrumentName %></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

export default class SceneCo909 {
  constructor(experience, config) {

    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    this.$viewElem = null;
    this.instrument = null;

    const clientIndex = soundworks.client.index;
    this.clientIndex = clientIndex;
    this.numSteps = config.numSteps;
    this.sequence = new Array(this.numSteps);
    this.clear();

    const canvasMin = Math.min(window.innerWidth, window.innerHeight);
    this.buttonRadius = canvasMin / 15;
    this.circleRadius = canvasMin / 2 - this.buttonRadius - 10;
    this.renderer = new Renderer(this.sequence, this.circleRadius, this.buttonRadius, '#' + playerColors[clientIndex]);
    this.audioOutput = experience.audioOutput;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
  }

  startPlacer() {
    this.placer.start(() => this.startScene());
  }

  startScene() {
    const experience = this.experience;

    this.$viewElem = experience.view.$el;

    experience.view.model = { instrumentName: this.instrument.name.toUpperCase() };
    experience.view.template = template;
    experience.view.render();
    experience.view.addRenderer(this.renderer);
    experience.view.setPreRender(function (ctx, dt, canvasWidth, canvasHeight) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.rect(0, 0, canvasWidth, canvasHeight);
      ctx.fill();
      ctx.restore();
    });

    experience.surface.addListener('touchstart', this.onTouchStart);
    experience.metricScheduler.addMetronome(this.onMetroBeat, this.numSteps, this.numSteps, 1, 0, true);
  }

  enter() {
    if (this.instrument) {
      this.startPlacer();
    } else {
      const experience = this.experience;
      const instrumentConfig = this.config.instruments[soundworks.client.index];

      experience.audioBufferManager.loadFiles(instrumentConfig).then((instrument) => {
        this.instrument = instrument;
        this.startPlacer();
      });
    }
  }

  exit() {
    this.clear();
    this.placer.stop();

    if(this.$viewElem !== null) {
      this.$viewElem = null;

      const experience = this.experience;
      experience.view.removeRenderer(this.renderer);
      experience.metricScheduler.removeMetronome(this.onMetroBeat);
      experience.surface.removeListener('touchstart', this.onTouchStart);
    }
  }

  clear() {
    for (let i = 0; i < this.sequence.length; i++)
      this.sequence[i] = 0;
  }

  onTouchStart(id, x, y) {
    const experience = this.experience;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x0 = width / 2;
    const y0 = height / 2;
    const relX = x - x0;
    const relY = y - y0;
    const radius = Math.sqrt(relX * relX + relY * relY);
    const minRadius = this.circleRadius - 2 * this.buttonRadius;
    const maxRadius = this.circleRadius + 2 * this.buttonRadius;
    const angle = Math.floor(radToDegrees(Math.atan2(-relY, relX)));

    if (radius > minRadius && radius < maxRadius) {
      const beat = Math.floor((this.numSteps * (450 - angle) / 360) + 0.5) % this.numSteps;
      let state = (this.sequence[beat] + 1) % 3;
      this.sequence[beat] = state;
      experience.send('switchNote', this.clientIndex, beat, state);
    }
  }

  onMetroBeat(measure, beat) {
    // const state = this.sequence[beat];

    // if (state > 0) {
    //   const time = audioScheduler.currentTime;
    //   const layer = this.instrument.layers[state - 1];

    //   const gain = audioContext.createGain();
    //   gain.connect(this.audioOutput);
    //   gain.gain.value = decibelToLinear(layer.gain);

    //   const src = audioContext.createBufferSource();
    //   src.connect(gain);
    //   src.buffer = layer.buffer;
    //   src.start(time);
    // }

    this.renderer.setHighlight(beat);
  }
}
