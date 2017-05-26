///////////////////// NEOPIXEL INIT
#include <Adafruit_NeoPixel.h>
#ifdef __AVR__
#include <avr/power.h>
#endif

const int eyeCorrection[] = {  0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2,
                               2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4,
                               4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7,
                               7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 10, 10, 10, 10, 11, 11,
                               11, 12, 12, 12, 13, 13, 13, 14, 14, 15, 15, 15, 16, 16, 17, 17,
                               17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25,
                               25, 26, 26, 27, 28, 28, 29, 29, 30, 31, 31, 32, 32, 33, 34, 34,
                               35, 36, 37, 37, 38, 39, 39, 40, 41, 42, 43, 43, 44, 45, 46, 47,
                               47, 48, 49, 50, 51, 52, 53, 54, 54, 55, 56, 57, 58, 59, 60, 61,
                               62, 63, 64, 65, 66, 67, 68, 70, 71, 72, 73, 74, 75, 76, 77, 79,
                               80, 81, 82, 83, 85, 86, 87, 88, 90, 91, 92, 94, 95, 96, 98, 99,
                               100, 102, 103, 105, 106, 108, 109, 110, 112, 113, 115, 116, 118, 120, 121, 123,
                               124, 126, 128, 129, 131, 132, 134, 136, 138, 139, 141, 143, 145, 146, 148, 150,
                               152, 154, 155, 157, 159, 161, 163, 165, 167, 169, 171, 173, 175, 177, 179, 181,
                               183, 185, 187, 189, 191, 193, 196, 198, 200, 202, 204, 207, 209, 211, 214, 216,
                               218, 220, 223, 225, 228, 230, 232, 235, 237, 240, 242, 245, 247, 250, 252, 255
                            };

// Which pin on the Arduino is connected to the NeoPixels?
// On a Trinket or Gemma we suggest changing this to 1
#define PIN            5

// How many NeoPixels are attached to the Arduino?
#define NUMPIXELS       96
#define NUMSEGMENTS      8
#define NUMPIXELSPERLINE 4
Adafruit_NeoPixel pixels = Adafruit_NeoPixel(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

void setupNeopixel() {
  pixels.begin(); // This initializes the NeoPixel library.
}

void goLight() {
  pixels.show(); // This initializes the NeoPixel library.
}

void allLeds(int r, int g, int b) {
  for (int i = 0; i < NUMPIXELS; i++) {
    setLight(i, r, g, b);
  }
}

void line(int n, int r, int g, int b) { // 0-23 possible n of line
  int start = n * NUMPIXELSPERLINE;
  for (int i = start; i < start + NUMPIXELSPERLINE; i++) setLight(i, r, g, b);
}

void onTheline(int n, int onL, int r, int g, int b) { // 0-23 possible n of line
  int start = n * NUMPIXELSPERLINE;
  int selected = 0;

  if (n & 1) {
    selected = start + (3 - onL);
  } else {
    selected = start + onL;
    setLight(selected, r, g, b);
  }
  
  setLight(selected, r, g, b);
}

void cluster(int n, int r, int g, int b) { // 0-7 possible n of segments
  int start = n * 12;
  for (int i = start; i < start + 12; i++) setLight(i, r, g, b);
}

void circle(int n, int r, int g, int b) { // 0-3
  int startI = 0;
  int startJ = 0;

  switch (n) {
    case 0:
      startI = 7;
      startJ = 8;
      break;
    case 1:
      startI = 1;
      startJ = 6;
      break;
    case 2:
      startI = 2;
      startJ = 5;
      break;
    case 3:
      startI = 3;
      startJ = 4;
      break;

  }
  for (int i = startI, j = startJ; i < NUMPIXELS && j <= NUMPIXELS; i += 8, j += 8) {
    setLight(i, eyeCorrection[r], eyeCorrection[g], eyeCorrection[b]);
    setLight((j == NUMPIXELS) ? 0 : j, eyeCorrection[r], eyeCorrection[g], eyeCorrection[b]);
  }

}

void lineGradient(int n, int r, int g, int b, int r1, int g1, int b1) { // 0-23 possible n of line
  int start = n * NUMPIXELSPERLINE;
  float amt = 0.00;

  for (int i = start; i < start + NUMPIXELSPERLINE; i++) {
    int resultColor[3];
    if (n & 1)
      clerp(r, g, b, r1, g1, b1, amt, resultColor);
    else
      clerp(r1, g1, b1, r, g, b, amt, resultColor);
    amt += 0.25;
    setLight(i, resultColor[0], resultColor[1], resultColor[2]);
  }
}

void turnOffLights() {
  for (int i = 0; i < NUMPIXELS; i++) {
    setLight(i, 0, 0, 0);
  }
  //pixels.show(); // This sends the updated pixel color to the hardware.
}

void turnONWhiteLights() {
  for (int i = 0; i < NUMPIXELS; i++) {
    setLight(i, 255, 255, 255);
  }
  // pixels.show(); // This sends the updated pixel color to the hardware.
}

void setLight(uint8_t n, uint8_t r, uint8_t g, uint8_t b) {
  pixels.setPixelColor(n, pixels.Color(eyeCorrection[r], eyeCorrection[g], eyeCorrection[b]));
}

void clerp (int r1, int g1, int b1, int r2, int g2, int b2, float amt, int *pcolor) { // return resulting color in pcolor array
  if (amt < 0.0) amt = 0.0;
  if (amt > 1.0) amt = 1.0;

  int r = round(r1 + (r2 - r1) * amt);
  int g = round(g1 + (g2 - g1) * amt);
  int b = round(b1 + (b2 - b1) * amt);

  pcolor[0] = r;
  pcolor[1] = g;
  pcolor[2] = b;
}

