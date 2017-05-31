import * as soundworks from 'soundworks/client';
import Placer from './Placer';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

function radToDegrees(radians) {
  return radians * 180 / Math.PI;
}

const maxActives = {
  'perc': 3,
  'bass': 1,
  'melody': 3,
};

class Renderer extends soundworks.Canvas2dRenderer {
  constructor(states, notes) {
    super(0);

    this.states = states;
    this.notes = notes;
  }

  init() {}

  update(dt) {}

  render(ctx) {
    ctx.save();

    const notes = this.notes;
    const states = this.states;
    const numStates = states.length;
    const stepHeight = this.canvasHeight / numStates;
    const xStart = 10;
    const xEnd = this.canvasWidth - 10;
    let y = this.canvasHeight - stepHeight / 2;

    for (let i = 0; i < numStates; i++) {
      const state = states[i];
      const note = notes[i];

      ctx.beginPath();
      ctx.globalAlpha = 1;

      switch (note.class) {
        case 'perc':
          ctx.strokeStyle = '#ffe066';
          break;

        case 'bass':
          ctx.strokeStyle = '#67c0fc';
          break;

        case 'melody':
          ctx.strokeStyle = '#f45d4e';
          break;
      }

      switch (state) {
        case 0:
          ctx.lineWidth = 1;
          break;

        case 1:
          ctx.lineWidth = 7;
          break;
      }

      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      ctx.stroke();

      y -= stepHeight;
    }

    ctx.restore();

  }
}

const template = `
  <canvas class="background flex-middle"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-middle">
    <p class="player-index"><%= stepIndex %></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

export default class SceneCollectiveLoops {
  constructor(experience, config) {
    this.experience = experience;
    this.config = config;

    this.placer = new Placer(experience);

    this.clientIndex = soundworks.client.index;
    this.notes = null;
    this.$viewElem = null;

    const numSteps = config.numSteps;
    const numStates = config.playerNotes.length;

    this.states = new Array(numStates);
    this.clear();

    this.actives = {
      'perc': [],
      'bass': [],
      'melody': [],
    };

    this.notes = null;
    this.isPlacing = false;

    this.renderer = new Renderer(this.states, config.playerNotes);
    this.audioOutput = experience.audioOutput;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
  }

  startPlacer() {
    const experience = this.experience;
    const numSteps = this.config.numSteps;
    
    experience.metricScheduler.addMetronome(this.onMetroBeat, numSteps, numSteps);
    
    this.isPlacing = true;

    this.placer.start(() => {
      this.isPlacing = false;
      this.startScene();
    });
  }

  startScene() {
    const experience = this.experience;

    this.$viewElem = experience.view.$el;

    experience.view.model = { stepIndex: this.clientIndex + 1 };
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
  }

  enter() {
    const experience = this.experience;

    if (this.notes) {
      this.startPlacer();
    } else {
      const noteConfig = this.config.playerNotes;
      experience.audioBufferManager.loadFiles(noteConfig).then((notes) => {
        this.notes = notes;
        this.startPlacer();
      });
    }
  }

  exit() {
    this.clear();
    this.placer.stop();

    if (this.$viewElem) {
      this.$viewElem = null;

      const experience = this.experience;
      experience.view.removeRenderer(this.renderer);
      experience.surface.removeListener('touchstart', this.onTouchStart);
      experience.metricScheduler.removeMetronome(this.onMetroBeat);
    }
  }

  clear() {
    for (let i = 0; i < this.states.length; i++)
      this.states[i] = 0;
  }

  onTouchStart(id, x, y) {
    const experience = this.experience;
    const numStates = this.states.length;
    const normX = x / window.innerWidth;
    const normY = y / window.innerHeight;
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

  onMetroBeat(measure, beat) {
    if (this.isPlacing) {
      this.placer.blink(((beat / 2) % 2) === 0);
    } else if (beat === this.clientIndex) {
      const time = audioScheduler.currentTime;
      const states = this.states;
      const notes = this.notes;

      for (let i = 0; i < this.states.length; i++) {
        const state = states[i];
        const note = notes[i];

        if (state > 0) {
          const gain = audioContext.createGain();
          gain.connect(this.audioOutput);
          gain.gain.value = note.gain;

          const src = audioContext.createBufferSource();
          src.connect(gain);
          src.buffer = note.buffer;
          src.start(time);
        }
      }
    }
  }
}
