import * as soundworks from 'soundworks/client';
import Placer from './Placer';
import queenPlayer from '../../shared/QueenPlayer';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

function getTime() {
  return new Date().getTime();
}

function clip(value) {
  return Math.max(0, Math.min(1, value));
}

const numDiv = 1024;

class Renderer extends soundworks.Canvas2dRenderer {
  constructor() {
    super(0);

    this.blink = false;
  }

  init() {}

  update(dt) {}

  render(ctx) {
    if (this.blink) {
      this.blink = false;

      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#ffffff';
      ctx.rect(0, 0, canvasWidth, canvasHeight);
      ctx.fill();
      ctx.restore();
    }
  }

  triggerBlink() {
    this.blink = true;
  }
}

const template = `
  <canvas class="background flex-middle"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-middle">
    <p class="big"></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

export default class SceneWwryR {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    this.$viewElem = null;
    this.clientIndex = soundworks.client.index;
    this.track = null;

    const tempo = config.tempo;
    const tempoUnit = config.tempoUnit;
    this.measureDuration = 60 / (tempo * tempoUnit);

    const trackConfig = config.tracks[this.clientIndex];
    this.renderer = new Renderer();

    this.audioOutput = experience.audioOutput;

    this.onAcceleration = this.onAcceleration.bind(this);
    this.onRotationRate = this.onRotationRate.bind(this);
  }

  startPlacer() {
    this.placer.start(() => this.startScene());
  }

  startScene() {
    const experience = this.experience;
    const numSteps = this.config.numSteps;

    this.$viewElem = experience.view.$el;

    if (!this.queenPlayer) {
      const config = this.config;
      this.queenPlayer = new QueenPlayer(config);
    }

    this.queenPlayer.start(this.clientIndex, this.track);

    experience.view.model = {};
    experience.view.template = template;
    experience.view.render();
    experience.view.addRenderer(this.renderer);
    experience.view.setPreRender(function(ctx, dt, canvasWidth, canvasHeight) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#000000';
      ctx.rect(0, 0, canvasWidth, canvasHeight);
      ctx.fill();
      ctx.restore();
    });

    experience.motionInput.addListener('accelerationIncludingGravity', this.onAcceleration);
    experience.motionInput.addListener('rotationRate', this.onRotationRate);

    experience.metricScheduler.addMetronome(this.onMetroBeat, numSteps, numSteps);
  }

  enter() {
    const experience = this.experience;

    if (this.notes) {
      this.startPlacer();
    } else {
      const trackConfig = this.config.tracks[this.clientIndex];
      experience.audioBufferManager.loadFiles(trackConfig).then((track) => {
        this.track = track;
        this.startPlacer();
      });
    }
  }

  exit() {
    this.placer.stop();

    if (this.$viewElem) {
      this.$viewElem = null;

      const experience = this.experience;
      experience.view.removeRenderer(this.renderer);
      experience.motionInput.removeListener('accelerationIncludingGravity', this.onAcceleration);
      experience.motionInput.removeListener('rotationRate', this.onRotationRate);

      experience.metricScheduler.removeMetronome(this.onMetroBeat);
    }

    if (this.queenPlayer)
      this.queenPlayer.removeLoopTrack(0);
  }

  initHitDetect() {
    this.thresholdAlpha = 400;
    this.thresholdGamma = 500;

    this.lastTime = getTime();

    this.lastAlpha = null;
    this.lastBeta = null;
    this.lastGamma = null;
  }

  runHitDetect(alpha, beta, gamma) {
    if (this.lastAlpha !== null) {
      const deltaAlpha = Math.abs(this.lastAlpha - alpha);
      const deltaBeta = Math.abs(this.lastBeta - beta);
      const deltaGamma = Math.abs(this.lastGamma - gamma);

      if (Math.abs(alpha) > this.thresholdAlpha || Math.abs(gamma) > this.thresholdGamma) {
        const currentTime = getTime();
        const timeDifference = currentTime - this.lastTime;

        if (timeDifference > 100) {
          if (Math.abs(alpha) > this.thresholdAlpha && alpha < 0) {
            this.event.kind = "right";
          } else if (Math.abs(alpha) > this.thresholdAlpha && alpha >= 0) {
            this.event.kind = "left";
          } else if (Math.abs(gamma) > this.thresholdGamma && gamma < 0) {
            this.event.kind = "up";
          } else {
            this.event.kind = "down";
          }

          window.dispatchEvent(this.event);
          this.lastTime = getTime();
        }
      }
    }

    this.lastAlpha = alpha;
    this.lastBeta = beta;
    this.lastGamma = gamma;
  }

  onAcceleration(data) {
    const experience = this.experience;
    const time = experience.syncScheduler.currentTime;
    const accX = data[0];
    const accY = data[1];
    const accZ = data[2];

    experience.send('motionInput', this.clientIndex, time, 0);
  }

  onRotationRate(data) {
    const experience = this.experience;
    const time = experience.syncScheduler.currentTime;
    const gyroAlpha = data[0];
    const gyroBeta = data[1];
    const gyroGamma = data[2];

    experience.send('motionInput', this.clientIndex, time, 0);
  }

  onMetroBeat(measureCount, beatCount) {
    this.renderer.triggerBlink();
  }
}
