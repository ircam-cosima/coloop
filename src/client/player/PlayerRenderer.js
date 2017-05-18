import { Canvas2dRenderer } from 'soundworks/client';

export default class PlayerRenderer extends Canvas2dRenderer {
  constructor(states) {
    super(0);

    this.states = states;
    this.highlight = undefined;
  }

  init() {

    const canvasMax = Math.max(this.canvasWidth, this.canvasHeight);
    const r = canvasMax / 5;

    this.positionXArr = new Array();
    this.positionYArr = new Array();

    function initPositionX(i) {
      let x = (r * Math.cos(Math.PI / 2 - (i * (Math.PI / 8))));
      return x;
    }
    function initPositionY(i) {
      let y = (r * Math.sin(Math.PI / 2 - (i * (Math.PI / 8))));
      return y;
    }

    for(let i = 0; i < this.states.length; i++) {
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

      if (i === this.highlight && state == 0) {
       state = 3;
      }

      if (i === this.highlight && state == 1) {
       state = 4;
      }

      if (i === this.highlight && state == 2) {
       state = 4;
      }


      ctx.beginPath();
      ctx.globalAlpha = 1;

      switch (state) {
        case 0:
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = "#ffffff";
          break;

        case 1:
          ctx.fillStyle = '#A7BEFF';
          ctx.strokeStyle = "#ffffff";
          break;

        case 2:
          ctx.fillStyle = '#00217E';
          ctx.strokeStyle = "#ffffff";
          break;

        case 3:
          ctx.fillStyle = '#606060';
          ctx.strokeStyle = "#ffffff";
          break;

        case 4:
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = "#ffffff";
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
