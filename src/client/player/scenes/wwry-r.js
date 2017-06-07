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
  constructor(options = {}) {
    const thresholds = options.thresholds;

    this.thresholdAlpha = 400;
    this.thresholdBeta = 400;
    this.thresholdGamma = 400;
    this.thresholdDeltaTime = 0.1;

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

      if (timeDifference > this.thresholdDeltaTime) {

        if (alpha < -this.thresholdAlpha)
          hit = 'right';
        else if (alpha > this.thresholdAlpha)
          hit = 'left';
        else if (beta < -this.thresholdBeta)
          hit = 'out';
        else if (beta > this.thresholdBeta)
          hit = 'in';
        else if (gamma < -this.thresholdGamma)
          hit = 'up';
        else if (gamma > this.thresholdGamma)
          hit = 'down';

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

    this.thresholdAlpha = 400;
    this.thresholdGamma = 400;
    this.thresholdDeltaTime = 0.1;

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

    this.thresholdAlpha = 400;
    this.thresholdBeta = 400;
    this.thresholdGamma = 400;
    this.thresholdDeltaTime = 0.4;

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

class ChorusMotionHandler extends HitDetector {
  constructor(callback) {
    super();

    this.thresholdAlpha = 400;
    this.thresholdGamma = 500;
    this.thresholdDeltaTime = 0.1;

    this.markerWe = true;
    this.markerWill = true;

    this.callback = callback;
  }

  onRotationRate(data) {
    const hit = super.onRotationRate(data);

    if (hit === "left") {
      if (this.markerWe) {
        this.callback(1);
        this.markerWill = true;
      } else {
        this.callback(3);
        this.markerWill = false;
      }
    } else if (hit === "right") {
      if (this.markerWill) {
        this.callback(2);
        this.markerWe = false;
      } else {
        this.callback(4);
        this.markerWe = true;
      }
    } else if (hit === "up") {
      this.callback(5);
      this.markerWill = true;
    } else if (hit === "down") {
      this.callback(6);
      this.markerWe = true;
      this.markerWill = true;
    }
  }
}

class FreddyMotionHandler extends HitDetector {
  constructor(callback) {
    super();

    this.thresholdAlpha = 400;
    this.thresholdBeta = 400;
    this.thresholdGamma = 400;
    this.thresholdDeltaTime = 0.2;

    this.callback = callback;
  }

  onRotationRate(data) {
    const hit = super.onRotationRate(data);

    if (hit) {
      const index = Math.floor(6 * Math.random());
      this.callback(index);
    }
  }
}

class PowerChordMotionHandler {
  constructor(callback) {
    this.callback = callback;

    this.onAccelerationIncludingGravity = this.onAccelerationIncludingGravity.bind(this);
  }

  onAccelerationIncludingGravity(data) {
    const accX = data[0];
    const accY = data[1];
    const accZ = data[2];
    var pitch = 2 * Math.atan(accY / Math.sqrt(accZ * accZ + accX * accX)) / Math.PI;
    var position = 0.5 * (1 - pitch);

    if (position < 0)
      position = 0;
    else if (position > 1)
      position = 1;

    this.callback(position, position);
  }

  start(experience) {
    experience.motionInput.addListener('accelerationIncludingGravity', this.onAccelerationIncludingGravity);
  }

  stop(experience) {
    experience.motionInput.removeListener('accelerationIncludingGravity', this.onAccelerationIncludingGravity);
  }
}

class GuitarRiffMotionHandler {
  constructor(callback) {
    this.callback = callback;

    this.lastMag = 0.0;
    this.nextSegmentIndex = 15;
    this.currentSegmentIndex = 15;
    this.lastSegmentIndex = 15;
    this.lastOnsetTime = 0.0;

    this.onRotationRate = this.onRotationRate.bind(this);
  }

  onRotationRate(data) {
    const alpha = data[0];
    const beta = data[1];
    const gamma = data[2];
    var mag = Math.sqrt(alpha * alpha + gamma * gamma);
    var time = getTime();
    var deltaTime = time - this.lastOnsetTime;

    // fullfill anticipated beats
    if (this.nextSegmentIndex % 2 == 1 && deltaTime > 0.28125)
      this.nextSegmentIndex = (Math.floor(this.nextSegmentIndex / 2) + 1) * 2;
    else if (this.nextSegmentIndex % 4 == 2 && deltaTime > 0.54375)
      this.nextSegmentIndex = (Math.floor(this.nextSegmentIndex / 4) + 1) * 4;
    else if (this.nextSegmentIndex == 12 && deltaTime > 0.5)
      this.nextSegmentIndex = 16;
    else if (this.nextSegmentIndex == 14 && deltaTime > 0.1)
      this.nextSegmentIndex = 16;
    else if (this.nextSegmentIndex % 8 == 4 && deltaTime > 1.0875)
      this.nextSegmentIndex = (Math.floor(this.nextSegmentIndex / 8) + 1) * 8;

    if (mag > this.lastMag && mag > 450 && deltaTime > 0.130) {
      if (deltaTime < 0.250)
        this.nextSegmentIndex++;
      else if (deltaTime < 0.750)
        this.nextSegmentIndex = (Math.floor(this.nextSegmentIndex / 2) + 1) * 2;
      else if (deltaTime < 1.125)
        this.nextSegmentIndex = (Math.floor(this.nextSegmentIndex / 4) + 1) * 4;
      else if (deltaTime < 2.250)
        this.nextSegmentIndex = (Math.floor(this.nextSegmentIndex / 8) + 1) * 8;
      else
        this.nextSegmentIndex = 0;

      if (this.nextSegmentIndex > 15)
        this.nextSegmentIndex = 0;

      let segmentIndex = this.nextSegmentIndex;

      if (this.nextSegmentIndex === 4 && this.lastSegmentIndex === 0)
        this.currentSegmentIndex = 5;

      this.callback(segmentIndex);

      this.lastSegmentIndex = segmentIndex;
      this.lastOnsetTime = time;
    }

    this.lastMag = mag;
  }

  start(experience) {
    this.lastTime = 0;
    experience.motionInput.addListener('rotationRate', this.onRotationRate);
  }

  stop(experience) {
    experience.motionInput.removeListener('rotationRate', this.onRotationRate);
  }
}

class Renderer extends soundworks.Canvas2dRenderer {
  constructor() {
    super(0);

    this.color = '#' + playerColors[soundworks.client.index];
    this.intensity = 0;
  }

  init() {}

  update(dt) {}

  render(ctx) {
    const intensity = this.intensity;

    if (intensity > 0) {
      ctx.save();
      ctx.globalAlpha = intensity * intensity;
      ctx.fillStyle = this.color;
      ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.fill();
      ctx.restore();

      this.intensity = 0;
    }
  }

  triggerBlink(intensity = 1) {
    this.intensity = intensity;
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
        this.motionHandler = new DrumsMotionHandler(this.onMotionEvent);
        break;

      case 'verse':
        this.motionHandler = new VerseMotionHandler(this.onMotionEvent);
        break;

      case 'chorus':
        this.motionHandler = new ChorusMotionHandler(this.onMotionEvent);
        break;

      case 'freddy':
        this.motionHandler = new FreddyMotionHandler(this.onMotionEvent);
        break;

      case 'power chord':
        this.motionHandler = new PowerChordMotionHandler(this.onMotionEvent);
        break;

      case 'guitar riff':
        this.motionHandler = new GuitarRiffMotionHandler(this.onMotionEvent);
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
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#000000';
      ctx.rect(0, 0, canvasWidth, canvasHeight);
      ctx.fill();
      ctx.restore();
    });

    this.queenPlayer.startTrack(0, this.track);
    this.startMotion(this.track.name);
  }

  enter() {
    if (this.notes) {
      this.startPlacer();
    } else {
      const experience = this.experience;
      const trackConfig = this.config.tracks[this.clientIndex];

      experience.audioBufferManager.loadFiles(trackConfig).then((track) => {
        this.track = track;
        this.startPlacer();
      });
    }
  }

  exit() {
    this.placer.stop();

    if (this.queenPlayer)
      this.queenPlayer.stopTrack(0);


    if (this.$viewElem) {
      this.$viewElem = null;
      this.experience.view.removeRenderer(this.renderer);
      this.stopMotion();
    }
  }

  onMotionEvent(data, intensity) {
    this.renderer.triggerBlink(intensity);
    this.queenPlayer.onMotionEvent(0, data);
    this.experience.send('motionEvent', this.clientIndex, data);
  }
}
