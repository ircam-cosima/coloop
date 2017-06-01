#include <OneWire.h>
#include <DallasTemperature.h>

// Data wire is plugged into pin 2 on the Arduino
#define ONE_WIRE_BUS 6
#define TEMP_MEASURE_DELAY_MS 2000

// Setup a oneWire instance to communicate with any OneWire devices
// (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);

// Pass our oneWire reference to Dallas Temperature.
DallasTemperature sensors(&oneWire);
long timeTag = 0;
void thermometerSetup() {
  // Start up the library
  sensors.begin();
  timeTag = millis();
}

int getTemperature() {
  sensors.requestTemperatures(); // Send the command to get temperatures
  return sensors.getTempCByIndex(0);
}

void tempLoop() {

  if (millis() > timeTag + TEMP_MEASURE_DELAY_MS) {

    int temp = getTemperature();
    Serial.print(temp);
    Serial.println("°C");
    timeTag = millis();
  }

}



