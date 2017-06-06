import * as soundworks from 'soundworks/client';
import Placer from './Placer';
import QueenPlayer from '../../shared/QueenPlayer';
import colorConfig from '../../../shared/color-config';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();
const playerColors = colorConfig.players;

function getTime() {
  return 0.001 * (performance.now() || new Date().getTime());
}

class HitDetector {
  constructor() {
    this.thresholdAlpha = 400;
    this.thresholdGamma = 500;

    this.lastTime = undefined;
    this.onRotationRate = this.onRotationRate.bind(this);
  }

  onRotationRate(data) {
    const alpha = data[0];
    const beta = data[1];
    const gamma = data[2];
    let hit;

    if (Math.abs(alpha) > this.thresholdAlpha || Math.abs(gamma) > this.thresholdGamma) {
      const time = getTime();
      const timeDifference = time - this.lastTime;

      if (timeDifference > 0.1) {
        if (Math.abs(alpha) > this.thresholdAlpha && alpha < 0)
          hit = "right";
        else if (Math.abs(alpha) > this.thresholdAlpha && alpha >= 0)
          hit = "left";
        else if (Math.abs(gamma) > this.thresholdGamma && gamma < 0)
          hit = "up";
        else
          hit = "down";

        this.lastTime = time;
      }
    }

    return hit;
  }

  start(experience) {
    this.lastTime = getTime();
    experience.motionInput.addListener('rotationRate', this.onRotationRate);
  }

  stop(experience) {
    experience.motionInput.removeListener('rotationRate', this.onRotationRate);
  }
}

class DrumsMotionHandler extends HitDetector {
  constructor(callback) {
    super();
    this.callback = callback;
  }

  onRotationRate(data) {
    const hit = super.onRotationRate(data);

    if (hit === "left" || hit === "right")
      this.callback(2);
    else if (hit === "up" || hit === "down")
      this.callback((Math.random() < 0.5) ? 0 : 1);
  }
}

class VerseMotionHandler extends HitDetector {
  constructor(callback) {
    super();

    this.callback = callback;

    this.currentPositionInVerse = -1;
    this.verseIndex = 0;
    this.lastTime = 0;
  }

  onRotationRate(data) {
    const hit = super.onRotationRate(data);

    if (hit) {
      const time = getTime();
      const deltaTime = time - this.lastTime;

      if (deltaTime < 1) {
        this.currentPositionInVerse += 1;

        if (this.currentPositionInVerse === 16)
          this.verseIndex = (Math.floor(this.verseIndex + (this.currentPositionInVerse + 1) / 16)) % 3;

        this.currentPositionInVerse = this.currentPositionInVerse % 16;
      } else if (deltaTime >= 1 && deltaTime < 2 && this.currentPositionInVerse !== 0) {
        this.currentPositionInVerse -= 1;
      } else {
        this.currentPositionInVerse = 0;
      }

      const segmentIndex = this.verseIndex * (16 + 1) + this.currentPositionInVerse;
      this.callback(segmentIndex);

      this.lastTime = time;
    }
  }
}

class Renderer extends soundworks.Canvas2dRenderer {
  constructor() {
    super(0);

    this.color = '#' + playerColors[soundworks.client.index];
    this.blink = false;
  }

  init() {}

  update(dt) {}

  render(ctx) {
    if (this.blink) {
      this.blink = false;

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.color;
      ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
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
    <p class="instrument-name"><%= instrumentName %></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

export default class SceneWwryR {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);
    this.motionHandler = null;
    this.queenPlayer = null;

    this.$viewElem = null;
    this.clientIndex = soundworks.client.index;
    this.track = null;

    const tempo = config.tempo;
    const tempoUnit = config.tempoUnit;
    this.measureDuration = 60 / (tempo * tempoUnit);

    const trackConfig = config.tracks[this.clientIndex];
    this.renderer = new Renderer();

    this.audioOutput = experience.audioOutput;

    this.onMotionEvent = this.onMotionEvent.bind(this);
  }

  startMotion(trackName) {
    const experience = this.experience;

    switch (trackName) {
      case 'drums':
      case 'drums':
      case 'chorus':
      case 'sing it':
      case 'power chord':
      case 'guitar riff':
        this.motionHandler = new DrumsMotionHandler(this.onMotionEvent);
        break;

      case 'verse':
        this.motionHandler = new VerseMotionHandler(this.onMotionEvent);
        break;
    }

    this.motionHandler.start(this.experience);
  }

  stopMotion(trackName) {
    if (this.motionHandler) {
      this.motionHandler.stop(this.experience);
      this.motionHandler = null;
    }
  }

  startPlacer() {
    this.placer.start(() => this.startScene());
  }

  startScene() {
    const experience = this.experience;

    this.$viewElem = experience.view.$el;

    if (!this.queenPlayer) {
      const config = this.config;
      this.queenPlayer = new QueenPlayer([this.audioOutput]);
    }

    experience.view.model = { instrumentName: this.track.name.toUpperCase() };
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

    this.queenPlayer.startTrack(0, this.track);
    this.startMotion(this.track.name);
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
    const experience = experience;

    this.placer.stop();

    if (this.$viewElem) {
      this.$viewElem = null;
      this.experience.view.removeRenderer(this.renderer);
      this.stopMotion();
    }

    if (this.queenPlayer)
      this.queenPlayer.stopTrack(0);
  }

  onMotionEvent(data) {
    this.renderer.triggerBlink();
    this.queenPlayer.onMotionEvent(0, data);
    this.experience.send('motionEvent', this.clientIndex, data);
  }
}
