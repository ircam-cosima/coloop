import SerialPort from 'serialport';

export default class LedDisplay extends EventEmitter {
  constructor() {
    super();

    // polar corrdinates
    this.pixels = [
      7, 8, 15, 16, 23, 24, 31, 32, 39, 40, 47, 48, 55, 56, 63, 64, 71, 72, 79, 80, 87, 88, 95, 0, // line 0
      1, 6, 9, 14, 17, 22, 25, 30, 33, 38, 41, 46, 49, 54, 57, 62, 65, 70, 73, 78, 81, 86, 89, 94, // line 1
      2, 5, 10, 13, 18, 21, 26, 29, 34, 37, 42, 45, 50, 53, 58, 61, 66, 69, 74, 77, 82, 85, 90, 93, // line 2
      3, 4, 11, 12, 19, 20, 27, 28, 35, 36, 43, 44, 51, 52, 59, 60, 67, 68, 75, 76, 83, 84, 91, 92 // line 3
    ];

    this.serialPort = null;
  }

  connect(port) {
    this.serialPort = new SerialPort(port, {
      baudrate: 9600,
      parser: SerialPort.parsers.readline('\n'),
    });

    this.serialPort.on('open', function() {
      console.log('Serial port opened');

    });

    this.serialPort.on('data', function(data) {
      if ((data.indexOf('+1') > -1) || (data.indexOf('-1') > -1)) {
        this.emit('buttonTurned', data);

        if (data.indexOf('+1') > -1)
          this.emit('buttonIncrimented');
        else if (data.indexOf('-1') > -1)
          this.emit('buttonDecrimented');
      } else if ((data.indexOf('touch') > -1) || (data.indexOf('released') > -1)) {
        this.emit('buttonClick', data);

        if (data.indexOf('touch') > -1)
          this.emit('buttonTouch');
        else if (data.indexOf('released') > -1)
          this.emit('buttonReleased');
      } else if (data.indexOf('°C') > -1) {
        this.serialPort.emit('temperature', parseInt(data));
      } else if (data.indexOf('Error')) {
        this.emit('error', data);
      }
      console.log(data);
    });
  }

  /////////////////////////////////////////////

  /*
   A 0xFFFFFF - all leds in this color
   B 0xFFFFFF 55 - led 55 in this color, leds from 0-95
   C 0xFFFFFF 3 - line 3 in this color, lines 0-24
   D 0xFFFFFF 2 - segment 2 in this color, segment 0-7
   E 0xFFFFFF 2 - circle in this color - from 0-3
   F 0xFFFFFF 0xFFF222 3 - gradient from color 1 to color 2 line 3
   G - turn off
   H - turn on white
   I - turn on LEDs
  */

  allPixels(hexColor) {
    if (isHex(hexColor))
      this.serialPort.write('A ' + hexColor + '\n');
    else
      throw new Error(`${hexColor} is not a valid hex number. Use this format : 0xFFFFFF`);
  }

  pixel(led, hexColor) {
    if ((led >= 0) && (led <= 95)) {
      if (isHex(hexColor))
        this.serialPort.write('B ' + hexColor + ' ' + pixels[led] + '\n');
      else
        throw new Error(`${hexColor} is not a valid hex number. Use this format : 0xFFFFFF`);
    } else {
      throw new Error(`Pixel number is out of scope! Pixels permitted : 0-95`);
    }
  }

  line(lineNumber, hexColor) {
    if ((lineNumber >= 0) && (lineNumber <= 23)) {
      if (isHex(hexColor))
        this.serialPort.write('C ' + hexColor + ' ' + lineNumber + '\n');
      else
        throw new Error(`${hexColor} is not a valid hex number. Use this format : 0xFFFFFF`);
    } else {
      throw new Error(`Line number is out of scope! Lines permitted : 0-23`);
    }
  }

  segment(segmentNumber, hexColor) {
    if ((segmentNumber >= 0) && (segmentNumber <= 7)) {
      if (isHex(hexColor))
        this.serialPort.write('D ' + hexColor + ' ' + segmentNumber + '\n');
      else
        throw new Error(`${hexColor} is not a valid hex number. Use this format : 0xFFFFFF`);
    } else {
      throw new Error(`Segment number is out of scope! Segments permitted : 0-7`);
    }
  }

  circle(circleNumber, hexColor) {
    if ((circleNumber >= 0) && (circleNumber <= 3)) {
      if (isHex(hexColor))
        this.serialPort.write('E ' + hexColor + ' ' + circleNumber + '\n');
      else
        throw new Error(`${hexColor} is not a valid hex number. Use this format : 0xFFFFFF`);
    } else {
      throw new Error(`Circle number is out of scope! Circles permitted : 0-3`);
    }
  }

  lineGradient(lineNumber, hexColor1, hexColor2) {
    if ((lineNumber >= 0) && (lineNumber <= 23)) {
      if ((isHex(hexColor1)) && (isHex(hexColor2)))
        this.serialPort.write('F ' + hexColor1 + ' ' + hexColor2 + ' ' + lineNumber + '\n');
      else
        throw new Error(`${hexColor} is not a valid hex number. Use this format : 0xFFFFFF`);
    } else {
      throw new Error(`Line number is out of scope! Lines permitted : 0-23`);
    }
  }

  clearPixels() {
    this.serialPort.write('G\n');
  }

  whitePixels() {
    this.serialPort.write('H\n');
  }

  redraw() {
    this.serialPort.write('I\n');
  }

  rgbToHex(r, g, b) {
      var color = (r << 16) | (g << 8) | b;
      var hex = '0x' + parseInt(color).toString(16);

      while (hex.length < 8) {
        hex += '0';
      }

      return hex;
    }
    // check if hex number is well formated
    // it must be in format 0xFFFFFF
  isHex(h) {
    var hh = h.split('0x');
    if (hh.length == 2) {
      hh = hh[1];
      if (hh === '000000') return true;
      var a = parseInt(hh, 16);
      return (a.toString(16) === hh.toLowerCase());
    } else {
      return false;
    }
  }
}