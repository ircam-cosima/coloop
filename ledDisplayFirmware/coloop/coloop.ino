
void setup() {
  Serial.begin(115200);
  setupNeopixel();
  encoderSetup();
  thermometerSetup();

}


void loop() {

  encoderLoop();
  //tempLoop();

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
     T - read & send temperature

  */

  if (Serial.available() > 0) {

    String inData = Serial.readStringUntil('\n');

    char instruction = inData.charAt(0);
    inData.remove(0, 2); // strip off instruction from string

    int color[3];
    int color2[3];
    String hex;
    String hexA;
    String hexB;
    int spacePosition = 0;
    int n = 0;
    int m = 0;
    switch (instruction) {
      case 'A':
        //Serial.println(inData);
        //Serial.println(inData.length());

        getColors(inData, color);
        allLeds(color[0], color[1], color[2]);
        //Serial.println(color[0]);
        //Serial.println(color[1]);
        //Serial.println(color[2]);

        //goLight();
        break;
      case 'B':
        spacePosition = inData.indexOf(' ');

        hex = inData.substring(0, spacePosition);
        getColors(hex, color);
        inData.remove(0, spacePosition + 1);
        n = inData.toInt();

        setLight(n, color[0], color[1], color[2]);
        //goLight();
        break;
      case 'C':
        spacePosition = inData.indexOf(' ');
        hex = inData.substring(0, spacePosition);
        getColors(hex, color);
        inData.remove(0, spacePosition + 1);
        n = inData.toInt();
        line(n, color[0], color[1], color[2]);
        //goLight();
        break;
      case 'D':
        spacePosition = inData.indexOf(' ');
        hex = inData.substring(0, spacePosition);
        getColors(hex, color);
        inData.remove(0, spacePosition + 1);
        n = inData.toInt();
        cluster(n, color[0], color[1], color[2]);
        //goLight();
        break;
      case 'E':
        spacePosition = inData.indexOf(' ');
        hex = inData.substring(0, spacePosition);
        getColors(hex, color);
        inData.remove(0, spacePosition + 1);
        n = inData.toInt();
        circle(n, color[0], color[1], color[2]);
        //goLight();
        break;
      case 'F':

        spacePosition = inData.indexOf(' ');
        hexA = inData.substring(0, spacePosition);
        getColors(hexA, color);
        inData.remove(0, spacePosition + 1);

        spacePosition = inData.indexOf(' ');
        hexB = inData.substring(0, spacePosition);
        getColors(hexB, color2);
        inData.remove(0, spacePosition + 1);

        n = inData.toInt();
        lineGradient(n, color[0], color[1], color[2], color2[0], color2[1], color2[2]);
        //goLight();
        break;
      case 'G':
        turnOffLights();
        //goLight();
        break;
      case 'H':
        turnONWhiteLights();
        //goLight();
        break;
      case 'I':
        goLight();
        break;
      case 'J':
        spacePosition = inData.indexOf(' ');
        hexA = inData.substring(0, spacePosition);
        getColors(hexA, color);
        inData.remove(0, spacePosition + 1);

        spacePosition = inData.indexOf(' ');
        hexB = inData.substring(0, spacePosition);
        n = inData.toInt();
        inData.remove(0, spacePosition + 1);

        m = inData.toInt();
        onTheline(n, m, color[0], color[1], color[2]);
        Serial.print(n);
        Serial.print("  ");
        Serial.println(m);


        break;

      case 'T':
        int temp = getTemperature();
        Serial.print(temp);
        Serial.println("°C");
        break;

    }

  }
}

void getColors(String in, int *out) {
  long aa = strtol(in.c_str(), NULL, 16);
  out[0] = (aa >> 16) & 0xFF; //red
  out[1] = (aa >> 8) & 0xFF; // green
  out[2] = (aa) & 0xFF; // blue
}


unsigned int getColorInt(int r, int g, int b) {
  return (r << 16) | (g << 8) | b;
}

