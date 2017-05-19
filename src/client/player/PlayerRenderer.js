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

// Defining constants that will be used for defining graphics
    this.buttonW = this.canvasWidth/14.0;
    this.buttonH = this.canvasHeight/2.84;
// this is atomic unit that will be used to compose graphics
    this.segmentW = this.canvasWidth/24.0;
    this.segmentH = this.canvasHeight/24.0;

    /// INIT POINTS FOR DRAWING CIRCLE
    // all the points inside circle dataviz.
    // Points are organized in 4 concentric circles with 24 leds in each circle
    // circlePointList[circle][led].x or circlePointList[circle][led].x
    // Points are precalculated to avoid trigonometry calc in realtime
    this.circlePointList = new Array();

    const tSteps = (Math.PI*2.0)/24.0;
    var radius = (this.segmentW*4)/2.0;

    var ln = 5;

    for (var i=0; i<4; i++) {
     var cnt = 0;
     var circles = new Array();
     for (var t = 0; t<Math.PI*2.0; t+=tSteps) {
       var x = this.segmentW*20.9 + radius*Math.cos(t);
       var y = this.segmentH*8 + radius*Math.sin(t);
       circles.push({"x":x, "y":y});
       cnt++;
     }
     this.circlePointList.push(circles);
     radius-=this.segmentH*0.5;
    }
    
    
  }

  update(dt) {

  }

  render(ctx) {
    ctx.save();

    const states = this.states;
    const numStates = states.length;

    // this is current playing selector
    var selector = -1;

    //iterate and draw all buttons
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
          selector = i;
          break;

        case 4:
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = "#ffffff";
          
          break;

        }

        // calculate button position
        var x = (i<8) ? this.segmentW+1.26*this.buttonW*i : this.segmentW+1.26*this.buttonW*(i-8);
        var y = (i<8) ? (this.segmentH*3) : (this.segmentH*3)+1.1*this.buttonH;

        this.roundRect(x,y, this.buttonW, this.buttonH, 7, ctx);

        ctx.fill();
        ctx.stroke();
    }

    /// draw dataViz here
    var selectInCircle = Math.round(this.mapF(selector, 0,15, 0,23));
    for (var i=0; i<this.circlePointList.length; i++) {
        for (var j=0; j<24; j++) {

            ctx.beginPath();
            ctx.arc(this.circlePointList[i][j].x, this.circlePointList[i][j].y, 2, 0, 2 * Math.PI, false);
            if (selectInCircle==j)
                ctx.fillStyle = 'white';
            else 
                ctx.fillStyle = 'grey';
            ctx.lineWidth = 0;
            ctx.strokeStyle = 'black';
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
        }
    }


    /// MUTE BUTTON
    this.roundRect(this.segmentW*19, this.segmentH*17.5, this.segmentW*4, this.segmentH*3, 7, ctx);
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();

  }

// simple function to calculate proportion
  mapF(value,istart,istop,ostart,ostop) {
   return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  }

// round rect routine
  roundRect(x, y, w, h, radius, context){ // radius is corner radius
    var r = x + w;
    var b = y + h;
    context.beginPath();
    context.moveTo(x+radius, y);
    context.lineTo(r-radius, y);
    context.quadraticCurveTo(r, y, r, y+radius);
    context.lineTo(r, y+h-radius);
    context.quadraticCurveTo(r, b, r-radius, b);
    context.lineTo(x+radius, b);
    context.quadraticCurveTo(x, b, x, b-radius);
    context.lineTo(x, y+radius);
    context.quadraticCurveTo(x, y, x+radius, y);
    context.stroke();
  }

  setHighlight(index) {
    this.highlight = index;
  }
}
