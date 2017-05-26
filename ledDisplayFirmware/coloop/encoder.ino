
// usually the rotary encoders three pins have the ground pin in the middle
enum PinAssignments {
  encoderPinA = 3,   // rigth
  encoderPinB = 2,   // left
  clearButton = 4    // another two pins
};

volatile unsigned long encoderPos = 1;  // a counter for the dial
unsigned long lastReportedPos = 1;   // change management
static boolean rotating = false;    // debounce management

// interrupt service routine vars
boolean A_set = false;
boolean B_set = false;

#define N_SAMPLES 3
unsigned int mem[N_SAMPLES];

int p_state = 1;
void encoderSetup() {

  pinMode(encoderPinA, INPUT_PULLUP);
  pinMode(encoderPinB, INPUT_PULLUP);
  pinMode(clearButton, INPUT_PULLUP);

  // encoder pin on interrupt 0 (pin 2)
  attachInterrupt(0, doEncoderA, CHANGE);
  // encoder pin on interrupt 1 (pin 3)
  attachInterrupt(1, doEncoderB, CHANGE);
}

void encoderLoop() {
  rotating = true;  // reset the debouncer

  if (lastReportedPos != encoderPos) {

    int v =  (lastReportedPos < encoderPos) ? 10 : 30;
    addValue(mem, v);
    int avg = calculateAverage(mem);
    int deltaA = abs(avg - 10);
    int deltaB = abs(avg - 30);
    Serial.println((deltaA > deltaB) ? "-1" : "+1");

    lastReportedPos = encoderPos;
  }
  int val = digitalRead(clearButton);
  if ((p_state == 1) && (val == 0)) {
    Serial.println("touch");
    delay(10);
  }

  if ((p_state == 0) && (val == 1)) {
    Serial.println("released");
    delay(10);
  }

  p_state = val;
}


/// INCRIMENTE

// Interrupt on A changing state
void doEncoderA() {
  // debounce
  if ( rotating ) delay (1);  // wait a little until the bouncing is done

  // Test transition, did things really change?
  if ( digitalRead(encoderPinA) != A_set ) { // debounce once more
    A_set = !A_set;

    // adjust counter + if A leads B
    if ( A_set && !B_set )
      encoderPos += 1;

    rotating = false;  // no more debouncing until loop() hits again
  }
}


/// DECRIMENTE
// Interrupt on B changing state, same as A above
void doEncoderB() {
  if ( rotating ) delay (1);
  if ( digitalRead(encoderPinB) != B_set ) {
    B_set = !B_set;
    //  adjust counter - 1 if B leads A
    if ( B_set && !A_set )
      encoderPos -= 1;

    rotating = false;
  }
}

void addValue(unsigned int *m, int val) {
  for (int i = 1; i < N_SAMPLES; i++) {
    m[i - 1] = m[i];
  }
  m[N_SAMPLES - 1] = val;
}

int calculateAverage(unsigned int *m) {
  unsigned long sum = 0;
  for (int i = 0; i < N_SAMPLES; i++) {
    sum += m[i];
  }
  // divide by integer to be faster
  // not using float points here
  sum /= N_SAMPLES;
  addValue(mem, sum);
  return sum;
}

