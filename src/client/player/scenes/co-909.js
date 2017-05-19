import * as soundworks from 'soundworks/client';
import { Canvas2dRenderer } from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

function radToDegrees(radians) {
  return radians * 180 / Math.PI;
}

class Renderer extends Canvas2dRenderer {
  constructor(states) {
    super(0);

    this.states = states;
    this.highlight = undefined;
  }

  init() {
    const canvasMax = Math.max(this.canvasWidth, this.canvasHeight);
    const r = canvasMax / 5;

    this.positionXArr = [];
    this.positionYArr = [];

    function initPositionX(i) {
      let x = (r * Math.cos(Math.PI / 2 - (i * (Math.PI / 8))));
      return x;
    }

    function initPositionY(i) {
      let y = (r * Math.sin(Math.PI / 2 - (i * (Math.PI / 8))));
      return y;
    }

    for (let i = 0; i < this.states.length; i++) {
      this.positionXArr.push(initPositionX(i));
      this.positionYArr.push(initPositionY(i));
    }
  }

  update(dt) {

  }

  render(ctx) {
    ctx.save();

    const canvasMax = Math.max(this.canvasWidth, this.canvasHeight);
    const r = canvasMax / 5;
    const stepRadius = r / 6;
    const states = this.states;
    const numStates = states.length;
    const yMargin = this.canvasHeight / 2;
    const xMargin = this.canvasWidth / 2;


    for (let i = 0; i < numStates; i++) {
      let state = states[i];

      ctx.beginPath();
      ctx.globalAlpha = 1;

      switch (state) {
        case 0:
          if (i === this.highlight) {
            ctx.fillStyle = '#606060';
            ctx.strokeStyle = "#ffffff";
          } else {
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = "#ffffff";
          }
          break;

        case 1:
          if (i === this.highlight) {
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = "#ffffff";
          } else {
            ctx.fillStyle = '#00217E';
            ctx.strokeStyle = "#ffffff";
          }
          break;

        case 2:
          if (i === this.highlight) {
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = "#ffffff";
          } else {
            ctx.fillStyle = '#A7BEFF';
            ctx.strokeStyle = "#ffffff";
          }
          break;
      }

      ctx.ellipse(xMargin + this.positionXArr[i], yMargin - this.positionYArr[i], stepRadius, stepRadius, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
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

export default class Co909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;
    this.loadedConfig = null;

    this.instrument = null;
    this.$viewElem = null;

    this.sequence = new Array(config.numSteps);
    this.resetSequence();

    this.renderer = new Renderer(this.sequence);
    this.audioOutput = experience.audioOutput;

    this.onClear = this.onClear.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
  }

  enterScene() {
    const experience = this.experience;

    this.$viewElem = experience.view.$el;

    experience.view.model = { instrumentName: this.instrument.name.toUpperCase() };
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

  enter() {
    const experience = this.experience;

    if(this.instrument) {
      this.enterScene();
    } else {
      const instrumentConfig = this.config.instruments[soundworks.client.index];
      experience.audioBufferManager.loadFiles(instrumentConfig).then((instrument) => {
        this.instrument = instrument;
        this.enterScene();        
      });
    }
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
    const experience = this.experience;
    const boundingRect = this.$viewElem.getBoundingClientRect();
    const x = 2 * normX * boundingRect.width;
    const y = 2 * normY * boundingRect.height;
    const xFromCenter = x - boundingRect.width;
    const yFromCenter = -(y - boundingRect.height);
    const x0 = boundingRect.width;
    const y0 = boundingRect.height;
    const radius = Math.sqrt(Math.pow((x - x0), 2) + Math.pow((y - y0), 2));
    const canvasMax = Math.max(boundingRect.width * 2, boundingRect.height * 2);
    const r1 = canvasMax / 6;
    const r2 = canvasMax / 4;
    const angle = Math.floor(radToDegrees(Math.atan2(yFromCenter, xFromCenter)));

    if (r1 < radius) {
      if (radius < r2) {
        const beat = Math.floor((16 * (450 - angle) / 360) + 0.5) % 16;
        let state = (this.sequence[beat] + 1) % 3;
        this.sequence[beat] = state;
        experience.send('switchNote', soundworks.client.index, beat, state);
      }
    }
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
