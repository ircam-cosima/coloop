import { Canvas2dRenderer } from 'soundworks/client';

export default class PlayerRenderer extends Canvas2dRenderer {
  constructor(states) {
    super(0);

    this.states = states;
    this.highlight = undefined;
  }

  init() {

  }

  update(dt) {

  }

  render(ctx) {
    ctx.save();

    const states = this.states;
    const numStates = states.length;
    const yMargin = 6;
    const stepHeight = this.canvasHeight / numStates;
    const rectHeight = stepHeight - 2 * yMargin;
    const xMargin = (this.canvasWidth - rectHeight) / 2;
    const rectWidth = this.canvasWidth - 2 * xMargin;
    const x = xMargin;
    let y = yMargin;

    for (let i = 0; i < numStates; i++) {
      let state = states[i];

      if (i === this.highlight)
        state = 3;

      ctx.beginPath();
      ctx.globalAlpha = 1;

      switch (state) {
        case 0:
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = "#ffffff";
          break;

        case 1:
          ctx.fillStyle = '#3f3f3f';
          ctx.strokeStyle = "#ffffff";
          break;

        case 2:
          ctx.fillStyle = '#7f7f7f';
          ctx.strokeStyle = "#ffffff";
          break;

        case 3:
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = "#ffffff";
          break;
      }

      ctx.rect(x, y, rectWidth, rectHeight);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      
      y += stepHeight;
    }

    ctx.restore();
  }

  setHighlight(index) {
    this.highlight = index;
  }
}
