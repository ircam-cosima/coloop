import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

function radToDegrees(radians) {
  return radians * 180 / Math.PI;
}

class Renderer extends soundworks.Canvas2dRenderer {
  constructor(states, circleRadius, buttonRadius) {
    super(0);

    this.states = states;
    this.circleRadius = circleRadius;
    this.buttonRadius = buttonRadius;
    this.highlight = undefined;
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
    const yMargin = this.canvasHeight / 2;
    const xMargin = this.canvasWidth / 2;

    for (let i = 0; i < numSteps; i++) {
      const state = states[i];

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

      ctx.ellipse(xMargin + this.positionXArr[i], yMargin - this.positionYArr[i], buttonRadius, buttonRadius, 0, 0, 2 * Math.PI);
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

export default class SceneCo909 {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.instrument = null;
    this.$viewElem = null;

    this.clientIndex = soundworks.client.index;
    this.numSteps = config.numSteps;
    this.sequence = new Array(this.numSteps);
    this.resetSequence();

    const canvasMin = Math.min(window.innerWidth, window.innerHeight);
    this.buttonRadius = canvasMin / 15;
    this.circleRadius = canvasMin / 2 - this.buttonRadius - 10;
    this.renderer = new Renderer(this.sequence, this.circleRadius, this.buttonRadius);
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
    experience.metricScheduler.addMetronome(this.onMetroBeat, this.numSteps, this.numSteps);
    experience.sharedParams.addParamListener('clear', this.onClear);
  }

  enter() {
    const experience = this.experience;

    if(this.instrument) {
      this.enterScene();
    } else {
      const instrumentConfig = this.config.playerInstruments[soundworks.client.index];
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
    this.resetSequence();
  }

  resetSequence() {
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
    const state = this.sequence[beat];

    if (state > 0) {
      const time = audioScheduler.currentTime;
      const src = audioContext.createBufferSource();
      src.connect(this.audioOutput);
      src.buffer = (state === 1) ? this.instrument.low : this.instrument.high;
      src.start(time);
    }

    this.renderer.setHighlight(beat);
  }

  onClear() {
    this.resetSequence();
  }
}
