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
  constructor(states, notes, index) {
    super(0);

    this.states = states;
    this.notes = notes;
    this.myindex = index;
    this.beatBanged = false;
  }

  init() { }

  update(dt) { }

  hexToRgbA(hex, alpha) {
    var c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    throw new Error('Bad Hex');
  }

  beatBang(data) {
    //console.log("NOW", data);
    this.beatBanged = true;
    setTimeout(() => { this.beatBanged = false; }, 300);
  }

  render(ctx) {
    ctx.save();

    const notes = this.notes;
    const states = this.states;
    const numStates = states.length;
    const stepHeight = this.canvasHeight / numStates;
    const xStart = 10;
    const xEnd = this.canvasWidth - 10;
    let y = this.canvasHeight - stepHeight / 2;

    // console.log(this.myindex);


    const primaryColors = ["#FF0000", "#00FF55", "#023EFF", "#FFFF00", "#D802FF", "#00FFF5", "#FF0279", "#FF9102"];


    for (let i = 0; i < numStates; i++) {
      const state = states[i];
      const note = notes[i];

      ctx.beginPath();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = primaryColors[this.myindex];

      switch (note.class) {
        case 'perc':
          ctx.setLineDash([15, 5]);
          break;

        case 'bass':
          ctx.setLineDash([]);

          break;

        case 'melody':
          ctx.setLineDash([5, 5]);
          break;
      }

      switch (state) {
        case 0:
          ctx.lineWidth = 2;
          break;

        case 1:
          if (this.beatBanged)
            ctx.lineWidth = 15;
          else
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
    
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;
//<p class="player-index"><%= stepIndex %></p>
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

    this.renderer = new Renderer(this.states, config.playerNotes, this.clientIndex);
    this.audioOutput = experience.audioOutput;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMetroBeat = this.onMetroBeat.bind(this);
  }

  startPlacer() {
    this.placer.start(() => this.startScene());
  }

  startScene() {
    const experience = this.experience;
    const numSteps = this.config.numSteps;

    this.$viewElem = experience.view.$el;

    experience.view.model = { stepIndex: this.clientIndex + 1 };
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
    experience.metricScheduler.addMetronome(this.onMetroBeat, 1, 1, 1, this.clientIndex / numSteps);
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
    const time = audioScheduler.currentTime;
    const states = this.states;
    const notes = this.notes;

    this.renderer.beatBang(beat);

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