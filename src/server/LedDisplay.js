import SerialPort from 'serialport';
const EventEmitter = require('events');
const fs = require('fs');

export default class LedDisplay extends EventEmitter {
  constructor() {
    super();

    // polar corrdinates
    this.pixels = [
      7, 8, 15, 16, 23, 24, 31, 32, 39, 40, 47, 48, 55, 56, 63, 64, 71, 72, 79, 80, 87, 88, 95, 96, 103, 104, 111, 112, 119, 120, 127, 0,
      1, 6, 9, 14, 17, 22, 25, 30, 33, 38, 41, 46, 49, 54, 57, 62, 65, 70, 73, 78, 81, 86, 89, 94, 97, 102, 105, 110, 113, 118, 121, 126,
      2, 5, 10, 13, 18, 21, 26, 29, 34, 37, 42, 45, 50, 53, 58, 61, 66, 69, 74, 77, 82, 85, 90, 93, 98, 101, 106, 109, 114, 117, 122, 125,
      3, 4, 11, 12, 19, 20, 27, 28, 35, 36, 43, 44, 51, 52, 59, 60, 67, 68, 75, 76, 83, 84, 91, 92, 99, 100, 107, 108, 115, 116, 123, 124
    ];

    this.serialPort = null;
  }

  connect(port = null, openCallback = function () { }) {

    // TODO convert this to async call
    if (port === null) {

      fs.readdirSync('/dev').forEach(file => {
        if (file.indexOf("wchusbserial") > -1) {
          port = '/dev/' + file;
          console.log("Found screen in :", port);
        }
      });
    }

    if (fs.existsSync(port)) {
      this.serialPort = new SerialPort(port, {
        baudrate: 115200,
        parser: SerialPort.parsers.readline('\n'),
      });

      this.serialPort.on('open', () => {
        console.log('Serial port opened');
        openCallback();
      });

      this.serialPort.on('data', (data) => {
        if ((data.indexOf('+1') > -1) || (data.indexOf('-1') > -1)) {
          this.emit('buttonTurned', data);

          if (data.indexOf('+1') > -1)
            this.emit('buttonIncremented');
          else if (data.indexOf('-1') > -1)
            this.emit('buttonDecremented');
        } else if ((data.indexOf('touch') > -1) || (data.indexOf('released') > -1)) {
          this.emit('buttonClick', data);

          if (data.indexOf('touch') > -1)
            this.emit('buttonTouch');
          else if (data.indexOf('released') > -1)
            this.emit('buttonReleased');
        } else if (data.indexOf('°C') > -1) {
          this.emit('temperature', parseInt(data));
        } else {
          // console.log('received unhandled data from serial port:', data);
        }
        //console.log(data);
      });
    } else {
      console.log("Port", port, "doesn't exist!! Cannot open display.");
    }
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
     J 0xFFFFFF 0 2 - color on the line 0 and led 2
 
  */
  requestTemperature() {
    if (this.serialPort)
      this.serialPort.write('T\n');
     // console.log("ASKED FOR TEMPERATURE");
  }
  allPixels(hexColor) {
    if (this.serialPort) {
      this.serialPort.write('A ' + hexColor + '\n');

    }
  }

  pixel(led, hexColor) {
    if (this.serialPort) {
      if ((led >= 0) && (led <= 127)) {
        this.serialPort.write('B ' + hexColor + ' ' + this.pixels[led] + '\n');
      } else {
        throw new Error(`Pixel number is out of scope! Pixels permitted : 0-95`);
      }
    }
  }

  line(lineNumber, hexColor) {
    if (this.serialPort) {
      if ((lineNumber >= 0) && (lineNumber <= 31)) {
        this.serialPort.write('C ' + hexColor + ' ' + lineNumber + '\n');
      } else {
        throw new Error(`Line number is out of scope! Lines permitted : 0-31`);
      }
    }
  }

  ledOnLine(lineNumber, led, hexColor) {
    if (this.serialPort) {
      this.serialPort.write('J ' + hexColor + ' ' + lineNumber + ' ' + led + '\n');
    }
  }

  segment(segmentNumber, hexColor) {
    if (this.serialPort) {
      if ((segmentNumber >= 0) && (segmentNumber <= 7)) {
        this.serialPort.write('D ' + hexColor + ' ' + segmentNumber + '\n');
       // console.log('OUT','D ' + hexColor + ' ' + segmentNumber + '\n' );
      } else {
        throw new Error(`Segment number is out of scope! Segments permitted : 0-7`);
      }
    }
  }

  circle(circleNumber, hexColor) {
    if (this.serialPort) {
      if ((circleNumber >= 0) && (circleNumber <= 3)) {

        this.serialPort.write('E ' + hexColor + ' ' + circleNumber + '\n');

      } else {
        throw new Error(`Circle number is out of scope! Circles permitted : 0-3`);
      }
    }
  }

  lineGradient(lineNumber, hexColor1, hexColor2) {
    if (this.serialPort) {
      if ((lineNumber >= 0) && (lineNumber <= 31)) {

        this.serialPort.write('F ' + hexColor1 + ' ' + hexColor2 + ' ' + lineNumber + '\n');

      } else {
        throw new Error(`Line number is out of scope! Lines permitted : 0-31`);
      }
    }
  }


  clearPixels() {
    if (this.serialPort)
      this.serialPort.write('G\n');
  }

  whitePixels() {
    if (this.serialPort)
      this.serialPort.write('H\n');
  }

  redraw() {
    if (this.serialPort)
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


}