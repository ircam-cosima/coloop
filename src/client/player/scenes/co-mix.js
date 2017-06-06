import * as soundworks from 'soundworks/client';
import Placer from './Placer';
import LoopPlayer from '../../shared/LoopPlayer';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

function clip(value) {
  return Math.max(0, Math.min(1, value));
}

const numDiv = 1024;

class Renderer extends soundworks.Canvas2dRenderer {
  constructor(measureDuration) {
    super(0);

    this.measureDuration = measureDuration;
    this.layer = null;
    this.layerIndex = 0;
    this.layerPending = false;
    this.measureStartTime = 0;
    this.measurePhase = 0;
  }

  init() {
    const canvasMin = Math.min(this.canvasWidth, this.canvasHeight);
    this.ringRadius = canvasMin / 3;
    this.innerRadius = 5 * canvasMin / 24 - 10;
    this.width = Math.PI / 128;
    this.lineWidth = canvasMin / 4;
  }

  setLayerIndex(index) {
    this.layerIndex = index;
    this.layerPending = true;
  }

  setMeasure(audioTime, layer, measureCount) {
    this.layer = layer;
    this.layerPending = false;
    this.measureStartTime = audioTime;
    this.loopMeasure = measureCount % layer.length;
    this.measurePhase = 0;
  }

  update(dt) { }

  render(ctx) {
    const measureStartTime = this.measureStartTime;
    let clientIndex = soundworks.client.index;
    let primaryColors = ["#FF0000", "#00FF55", "#023EFF", "#FFFF00", "#D802FF", "#00FFF5", "#FF0279", "#FF9102"];

    if (measureStartTime > 0) {
      const layer = this.layer;
      const x0 = this.canvasWidth / 2;
      const y0 = this.canvasHeight / 2;
      const ringRadius = this.ringRadius;
      const innerRadius = this.innerRadius;
      const width = this.width;
      const measureDuration = this.measureDuration;
      const loopMeasure = this.loopMeasure;
      const lastDiv = Math.floor(numDiv * this.measurePhase + 0.5);
      const time = audioScheduler.currentTime;
      const loopDuration = measureDuration * layer.length;
      const measurePhase = ((time - measureStartTime) % measureDuration) / measureDuration;
      let div = Math.floor(numDiv * measurePhase + 0.5);

      if (div < lastDiv)
        div += numDiv;

      ctx.save();

      for (let d = lastDiv; d < div; d++) {
        const phi = (d % numDiv) / numDiv;
        const angle = 2 * Math.PI * (phi - 0.25);
        const loopPhase = (loopMeasure + phi) / layer.length;
        const intensityIndex = Math.floor(loopPhase * layer.intensity.length + 0.5);
        const intensityInDb = layer.intensity[intensityIndex] + 36;
        const intensity = clip(Math.exp(0.3 * intensityInDb));

        ctx.strokeStyle = layer.color ||  primaryColors[clientIndex];

        ctx.globalAlpha = intensity;
        ctx.lineWidth = this.lineWidth;

        ctx.beginPath();
        ctx.arc(x0, y0, ringRadius, angle - width, angle + width);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.05;

      if (this.layerPending) {
        ctx.fillStyle = layer.color ||  primaryColors[clientIndex];
      } else {
        ctx.fillStyle = '#000000';
      }

      ctx.beginPath();
      ctx.arc(x0, y0, innerRadius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();

      this.measurePhase = measurePhase;
    }
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

export default class SceneCoMix {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    this.$viewElem = null;
    this.clientIndex = soundworks.client.index;
    this.track = null;
    this.layerIndex = 0;

    const tempo = config.tempo;
    const tempoUnit = config.tempoUnit;
    this.measureDuration = 60 / (tempo * tempoUnit);

    const trackConfig = config.tracks[this.clientIndex];
    this.renderer = new Renderer(this.measureDuration);

    this.intensity = trackConfig.intensity;
    this.audioOutput = experience.audioOutput;

    this.lastTrackCutoff = -Infinity;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMotionInput = this.onMotionInput.bind(this);
    this.onMeasureStart = this.onMeasureStart.bind(this);
  }

  startPlacer() {
    this.placer.start(() => this.startScene());
  }

  startScene() {
    const experience = this.experience;
    const numSteps = this.config.numSteps;

    this.$viewElem = experience.view.$el;

    if (!this.loopPlayer) {
      const config = this.config;
      this.loopPlayer = new LoopPlayer(experience.metricScheduler, [this.audioOutput], 1, config.tempo, config.tempoUnit, 0.05, this.onMeasureStart);
    }

    this.loopPlayer.addLoopTrack(0, this.track.layers);
    this.renderer.setMeasure(0, 0);

    experience.view.model = {};
    experience.view.template = template;
    experience.view.render();
    experience.view.addRenderer(this.renderer);
    experience.view.setPreRender(function (ctx, dt, canvasWidth, canvasHeight) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#000000';
      ctx.rect(0, 0, canvasWidth, canvasHeight);
      ctx.fill();
      ctx.restore();
    });

    experience.surface.addListener('touchstart', this.onTouchStart);
    experience.motionInput.addListener('accelerationIncludingGravity', this.onMotionInput);
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
      experience.surface.removeListener('touchstart', this.onTouchStart);
      experience.motionInput.removeListener('accelerationIncludingGravity', this.onMotionInput);
    }

    if (this.loopPlayer)
      this.loopPlayer.removeLoopTrack(0);
  }

  onTouchStart(id, normX, normY) {
    const experience = this.experience;

    const numLayers = this.track.layers.length;
    const layerIndex = (this.layerIndex + 1) % numLayers;

    this.layerIndex = layerIndex;
    this.loopPlayer.setLayer(0, layerIndex);
    this.renderer.setLayerIndex(layerIndex);
    experience.send('switchLayer', this.clientIndex, layerIndex);
  }

  onMotionInput(data) {
    const accX = data[0];
    const accY = data[1];
    const accZ = data[2];
    const pitch = 2 * Math.atan2(accY, Math.sqrt(accZ * accZ + accX * accX)) / Math.PI;
    const roll = -2 * Math.atan2(accX, Math.sqrt(accY * accY + accZ * accZ)) / Math.PI;
    const cutoff = 0.5 + Math.max(-0.8, Math.min(0.8, (accZ / 9.81))) / 1.6;

    if (Math.abs(cutoff - this.lastTrackCutoff) > 0.01) {
      const experience = this.experience;

      this.lastTrackCutoff = cutoff;
      this.loopPlayer.setCutoff(0, cutoff);

      experience.send('trackCutoff', this.clientIndex, cutoff);
    }
  }

  onMeasureStart(audioTime, measureCount) {
    const layer = this.track.layers[this.layerIndex];
    this.renderer.setMeasure(audioTime, layer, measureCount);
  }
}
