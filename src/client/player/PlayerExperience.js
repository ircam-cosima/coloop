import * as soundworks from 'soundworks/client';
import { centToLinear } from 'soundworks/utils/math';
import PlayerRenderer from './PlayerRenderer';
import machineDefinition from '../../shared/machine-definition';

const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

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

// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'] });
    // this.motionInput = this.require('motion-input', {
    //   descriptors: ['accelerationIncludingGravity']
    // });

    this.sharedParams = this.require('shared-params');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: machineDefinition.instruments,
    });

    this.metricScheduler = this.require('metric-scheduler');

    this.sequence = new Array(machineDefinition.numSteps);
    this.resetSequence();
  }

  start() {
    super.start(); // don't forget this

    this.instrument = this.audioBufferManager.data[soundworks.client.index];
    const instrumentName = this.instrument.name;

    this.view = new soundworks.CanvasView(template, { instrumentName: instrumentName.toUpperCase() }, {}, {
      id: this.id,
      ratios: {
        '.section-top': 0,
        '.section-center': 1,
        '.section-bottom': 0,
      },
    });

    this.show().then(() => {
      //this.initMotion();
      this.initSurface();
      this.initAudio();

      this.renderer = new PlayerRenderer(this.sequence);

      this.view.addRenderer(this.renderer);

      this.view.setPreRender(function(ctx, dt, canvasWidth, canvasHeight) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000000';
        ctx.rect(0, 0, canvasWidth, canvasHeight);
        ctx.fill();
        ctx.restore();
      });

      this.receive('clearAllNotes', () => this.resetSequence());

      const metrofunction = (measureCount, beatCount) => {
        this.renderer.setHighlight(beatCount);
        this.playBeat(beatCount);
      };

      this.metricScheduler.addMetronome(metrofunction, 16, 16);
    });
  }

  initMotion() {
    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', (data) => {
        const accX = data[0];
        const accY = data[1];
        const accZ = data[2];
        const mag = Math.sqrt(accX * accX + accY * accY + accZ * accZ);

        /* ??? */
      });
    }
  }

  initSurface() {

    const surface = new soundworks.TouchSurface(this.view.$el);

    surface.addListener('touchstart', (id, normX, normY) => {
      const boundingRect = this.view.$el.getBoundingClientRect();
      const x = 2 * normX * boundingRect.width;
      const y = 2 * normY * boundingRect.height;
      const xFromCenter = x - boundingRect.width;
      const yFromCenter = - (y - boundingRect.height);
      const x0 = boundingRect.width;
      const y0 = boundingRect.height;
      const radius = Math.sqrt(Math.pow((x - x0), 2) + Math.pow((y - y0), 2));
      const r1 = 190;
      const r2 = 310;
      const angle = Math.floor(this.mathDegrees(Math.atan2(yFromCenter,xFromCenter)));
      if (r1 < radius) {
        if (radius < r2) {
          const beat = Math.floor((16 * (450 - angle) / 360) + 0.5) % 16;
          const state = this.incrNoteState(beat);
          this.send('switchNote', beat, state);
        }
      }
    });
  }

  mathDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  initAudio() {
    this.master = audioContext.createGain();
    this.master.connect(audioContext.destination);
    this.master.gain.value = 1;
  }

  setNoteState(beat, state) {
    this.sequence[beat] = state;
  }

  incrNoteState(beat) {
    let state = (this.sequence[beat] + 1) % 3;
    this.sequence[beat] = state;
    return state;
  }

  resetSequence() {
    for (let i = 0; i < this.sequence.length; i++)
      this.sequence[i] = 0;
  }

  playBeat(beat) {
    const state = this.sequence[beat];

    if (state > 0) {
      const time = audioScheduler.currentTime;
      const src = audioContext.createBufferSource();
      src.connect(this.master);
      src.buffer = (state === 1) ? this.instrument.low : this.instrument.high;
      src.start(time);
    }
  }
}
