import * as soundworks from 'soundworks/client';
import Placer from './Placer';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

class Renderer extends soundworks.Canvas2dRenderer {
  constructor(track, loopDuration) {
    super(0);

    this.loopDuration = loopDuration;
    this.loopTime = 0;
    this.state = 0;
    this.track = track;
  }

  init() {}

  update(dt) {}

  render(ctx) {
    const loopTime = this.loopTime;

    if (loopTime > 0) {
      const x0 = this.canvasWidth / 2;
      const y0 = this.canvasHeight / 2;
      const canvasMin = Math.min(this.canvasWidth, this.canvasHeight);
      const radius = canvasMin / 4;
      const time = audioScheduler.currentTime;
      const angle = (360 * (time - loopTime) / loopDuration) % 360;
      const angleWidth = 10;

      ctx.save();
      ctx.beginPath();
      ctx.globalAlpha = 1;
      ctx.lineWidth = canvasMin / 6;

      switch (state) {
        case 0:
          ctx.strokeStyle = "#ffffff";
          break;

        case 1:
          ctx.strokeStyle = "#ffffff";
          break;
      }

      ctx.arc(x0, y0, radius, angle - angleWidth, angle + angleWidth);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
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

    const tempo = config.tempo;
    const tempoUnit = config.tempoUnit;
    const numBeats = config.numBeats;
    const beatDuration = 60 / tempo;
    const loopDuration = numBeats * beatDuration;
    const trackConfig = config.tracks[this.clientIndex];
    this.renderer = new Renderer(trackConfig, 0, loopDuration);
    this.intensity = trackConfig.intensity;
    this.audioOutput = experience.audioOutput;

    this.lastTrackCutoff = -Infinity;

    this.onClear = this.onClear.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMotionInput = this.onMotionInput.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
  }

  startPlacer() {
    this.placer.start(() => this.startScene());
  }

  startScene() {
    const experience = this.experience;
    const numSteps = this.config.numSteps;

    this.$viewElem = experience.view.$el;

    experience.view.model = {};
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
    experience.metricScheduler.addMetronome(this.onMetroBeat, 4, 1, 1); // tick on every measure for 4 measures
    experience.sharedParams.addParamListener('clear', this.onClear);

    this.motionInput.addListener('accelerationIncludingGravity', this.onMotionInput);
  }

  enter() {
    const experience = this.experience;

    if (this.notes) {
      this.startPlacer();
    } else {
      const trackConfig = config.tracks[this.clientIndex];
      experience.audioBufferManager.loadFiles(trackConfig).then((track) => {
        this.tracks = tracks;
        this.startPlacer();
      });
    }
  }

  exit() {
    this.stopTrack();
    this.placer.stop();

    if (this.$viewElem) {
      this.$viewElem = null;

      const experience = this.experience;
      experience.view.removeRenderer(this.renderer);
      experience.surface.removeListener('touchstart', this.onTouchStart);
      experience.metricScheduler.removeMetronome(this.onMetroBeat);
      experience.sharedParams.removeParamListener('clear', this.onClear);
    }
  }

  resetStates() {
    for (let i = 0; i < this.states.length; i++)
      this.states[i] = 0;
  }

  onTouchStart(id, normX, normY) {
    const experience = this.experience;
    const numStates = this.states.length;
    const note = numStates - 1 - Math.floor(normY * numStates);
    const noteClass = this.notes[note].class;
    const state = (this.states[note] + 1) % 2;
    const actives = this.actives[noteClass];

    if (state > 0) {
      actives.push(note);

      if (actives.length > maxActives[noteClass]) {
        const offNote = actives.shift();
        this.states[offNote] = 0;
        experience.send('switchNote', this.clientIndex, offNote, 0);
      }
    } else {
      const idx = actives.indexOf(note);
      actives.splice(idx, 1);
    }

    this.states[note] = state;
    experience.send('switchNote', this.clientIndex, note, state);
  }

  onMotionInput(data) {
    const accX = data[0];
    const accY = data[1];
    const accZ = data[2];
    const pitch = 2 * Math.atan2(accY, Math.sqrt(accZ * accZ + accX * accX)) / Math.PI;
    const roll = -2 * Math.atan2(accX, Math.sqrt(accY * accY + accZ * accZ)) / Math.PI;
    const cutoff = 0.5 + Math.max(-0.8, Math.min(0.8, (accZ / 9.81))) / 1.6;

    if (Math.abs(cutoff - this.lastTrackCutoff) > 0.01) {
      this.lastTrackCutoff = cutoff;

      //this.loopPlayer.setCutoff(this.playerId, cutoff);

      this.send('trackCutoff', this.clientIndex, cutoff);
    }
  }

  onMetroBeat(measure, beat) {
    const time = audioScheduler.currentTime;
    this.renderer.loopTime = time;
  }

  onClear() {

  }
}
