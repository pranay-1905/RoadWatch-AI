/*
 * ==============================================================================
 * RoadWatch AI — STM32F411CEU6 Black Pill Firmware
 * Final Year Engineering Capstone Project
 * 
 * Hardware Circuit Connections (per exact schematic):
 * 1. Power Distribution:
 *    - Raspberry Pi 3B+ Pin 2 (5V)  -> STM32F411CEU6 Pin 5V (Board Power)
 *    - Raspberry Pi 3B+ Pin 6 (GND) -> STM32F411CEU6 Pin G  (Common Ground)
 *    - STM32F411CEU6 Pin 3V3        -> MPU-6050 VCC & NEO-6M GPS VCC
 *    - STM32F411CEU6 Pin G          -> MPU-6050 GND & NEO-6M GPS GND
 * 
 * 2. MPU-6050 Accelerometer / Gyroscope -> I2C1
 *    - SCL -> PB6 (STM32 I2C1_SCL)
 *    - SDA -> PB7 (STM32 I2C1_SDA)
 * 
 * 3. NEO-6M GPS Receiver -> USART1 (9600 Baud)
 *    - TX  -> PA10 (STM32 USART1_RX)
 * 
 * 4. Raspberry Pi 3B+ Gateway -> USART2 (115200 Baud)
 *    - PA2 (STM32 USART2_TX) -> Raspberry Pi Pin 10 (RXD / GPIO 15)
 *    - PA3 (STM32 USART2_RX) <- Raspberry Pi Pin 8  (TXD / GPIO 14, Optional)
 * ==============================================================================
 */

#include <Wire.h>

// --- UART Peripherals ---
// USART1 for NEO-6M GPS (9600 Baud)
HardwareSerial SerialGPS(PA10, PA9); 
// USART2 for Raspberry Pi 3B+ (115200 Baud)
HardwareSerial SerialPi(PA3, PA2);   

// --- Pin Definitions ---
const int PIN_TRIGGER = PB12;  // Hardware interrupt pulse to Raspberry Pi
const int LED_STATUS  = PC13;  // Onboard Black Pill LED (Active LOW)

// --- MPU-6050 Registers ---
const int MPU_ADDR = 0x68;
const float SHOCK_THRESHOLD_G = 2.0; // Pothole shock trigger threshold (G-Force)
const unsigned long COOLDOWN_MS = 1500; // Minimum interval between triggers

// --- GPS State Variables ---
float currentLat = 21.1458;
float currentLng = 79.0882;
float currentSpeed = 35.0;
unsigned long lastTriggerTime = 0;
int detectionCounter = 100;

// Simple NMEA GPRMC/GPGGA Parser
void parseNMEALine(String nmea) {
  if (nmea.startsWith("$GPRMC") || nmea.startsWith("$GNRMC")) {
    int commaIndex = 0;
    String tokens[13];
    int tokenIdx = 0;
    for (int i = 0; i < nmea.length() && tokenIdx < 13; i++) {
      if (nmea.charAt(i) == ',' || nmea.charAt(i) == '*') {
        tokens[tokenIdx++] = nmea.substring(commaIndex, i);
        commaIndex = i + 1;
      }
    }
    // Check if GPS fix is valid ('A' = valid)
    if (tokenIdx >= 8 && tokens[2] == "A") {
      float rawLat = tokens[3].toFloat();
      String latDir = tokens[4];
      float rawLng = tokens[5].toFloat();
      String lngDir = tokens[6];
      float speedKnots = tokens[7].toFloat();

      // Convert DDMM.MMMM to Decimal Degrees
      int latDeg = (int)(rawLat / 100);
      float latMin = rawLat - (latDeg * 100);
      currentLat = latDeg + (latMin / 60.0);
      if (latDir == "S") currentLat = -currentLat;

      int lngDeg = (int)(rawLng / 100);
      float lngMin = rawLng - (lngDeg * 100);
      currentLng = lngDeg + (lngMin / 60.0);
      if (lngDir == "W") currentLng = -currentLng;

      currentSpeed = speedKnots * 1.852; // Convert knots to km/h
    }
  }
}

void initMPU6050() {
  Wire.begin();
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0x00); // Wake up MPU-6050
  Wire.endTransmission(true);

  // Set Accelerometer to +/- 8G sensitivity (FS_SEL = 2)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1C); // ACCEL_CONFIG register
  Wire.write(0x10); // 0b00010000 = +/- 8g
  Wire.endTransmission(true);
}

float readZAxisAcceleration() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Start reading from ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  if (Wire.available() >= 6) {
    int16_t rawX = (Wire.read() << 8) | Wire.read();
    int16_t rawY = (Wire.read() << 8) | Wire.read();
    int16_t rawZ = (Wire.read() << 8) | Wire.read();

    // With +/- 8G, sensitivity is 4096 LSB/g
    float gZ = (float)rawZ / 4096.0;
    return abs(gZ);
  }
  return 1.0; // Default 1G at rest
}

void setup() {
  // Initialize GPIOs
  pinMode(PIN_TRIGGER, OUTPUT);
  digitalWrite(PIN_TRIGGER, LOW);
  pinMode(LED_STATUS, OUTPUT);
  digitalWrite(LED_STATUS, HIGH); // Off initially (Active LOW)

  // Initialize Serial Ports
  SerialPi.begin(115200);   // UART to Raspberry Pi
  SerialGPS.begin(9600);    // UART to NEO-6M GPS

  // Initialize I2C Sensors
  initMPU6050();

  // Startup flash
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_STATUS, LOW);
    delay(100);
    digitalWrite(LED_STATUS, HIGH);
    delay(100);
  }
}

String gpsBuffer = "";

void loop() {
  // 1. Ingest GPS NMEA sentences
  while (SerialGPS.available() > 0) {
    char c = SerialGPS.read();
    if (c == '\n' || c == '\r') {
      if (gpsBuffer.length() > 10) {
        parseNMEALine(gpsBuffer);
      }
      gpsBuffer = "";
    } else {
      gpsBuffer += c;
    }
  }

  // 2. High-speed MPU-6050 sampling (100Hz = 10ms loop)
  float gZ = readZAxisAcceleration();

  // 3. Shock impact threshold verification
  if (gZ >= SHOCK_THRESHOLD_G && (millis() - lastTriggerTime > COOLDOWN_MS)) {
    lastTriggerTime = millis();
    detectionCounter++;

    // Pulse hardware trigger to Raspberry Pi GPIO
    digitalWrite(PIN_TRIGGER, HIGH);
    digitalWrite(LED_STATUS, LOW); // LED ON

    // Transmit JSON Telemetry Packet to Raspberry Pi over USART2
    // {"event":"POTHOLE","id":"RW-NGP-101","lat":21.14580,"lng":79.08820,"shock_g":2.45,"speed":34.2}
    SerialPi.print("{\"event\":\"POTHOLE\",\"id\":\"RW-NGP-");
    SerialPi.print(detectionCounter);
    SerialPi.print("\",\"lat\":");
    SerialPi.print(currentLat, 6);
    SerialPi.print(",\"lng\":");
    SerialPi.print(currentLng, 6);
    SerialPi.print(",\"shock_g\":");
    SerialPi.print(gZ, 2);
    SerialPi.print(",\"speed\":");
    SerialPi.print(currentSpeed, 1);
    SerialPi.println("}");

    delay(20); // Hold pulse 20ms
    digitalWrite(PIN_TRIGGER, LOW);
    digitalWrite(LED_STATUS, HIGH); // LED OFF
  }

  delay(10); // ~100Hz loop execution rate
}
