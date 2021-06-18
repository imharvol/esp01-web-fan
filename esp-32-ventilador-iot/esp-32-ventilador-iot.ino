#include <WiFiClientSecure.h>
#include <MQTT.h>
#include <analogWrite.h> // Es necesario para poder usar analogWrite en el ESP-32

#define RED_LED 19
#define GREEN_LED 18
#define BLUE_LED 17

const char ssid[] = "";
const char pass[] = "";
const char username[] = "";
const char password[] = "";
const char host[] = "";

WiFiClientSecure net;
MQTTClient client;

unsigned long lastMillis = 0;

void connect() {
  Serial.print("Connecting WIFI ...");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(1000);
  }

  Serial.print("\nConnecting MQTT ...");
  while (!client.connect("esp-32", username, password)) {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("\nConnected!");

  client.subscribe("on");
  client.subscribe("off");
  
  client.subscribe("red");
  client.subscribe("green");
  client.subscribe("blue");
}

void messageReceived(String &topic, String &payload) {
  Serial.println("Message: " + topic + " - " + payload);

  if (topic == "on") {
    digitalWrite(26, HIGH);
  } else if (topic == "off") {
    digitalWrite(26, LOW);
  } else if (topic == "red") {
    analogWrite(RED_LED, payload.toInt());
  } else if (topic == "green") {
    analogWrite(GREEN_LED, payload.toInt());
  } else if (topic == "blue") {
    analogWrite(BLUE_LED, payload.toInt());
  }
}

void setup() {
  // LED Strip
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);
  analogWrite(RED_LED, 0);
  analogWrite(GREEN_LED, 0);
  analogWrite(BLUE_LED, 0);

  // Relay
  pinMode(26, OUTPUT);
  digitalWrite(26, HIGH);
  
  Serial.begin(115200);
  WiFi.begin(ssid, pass);

  client.begin(host, 8883, net);
  client.onMessage(messageReceived);

  connect();
}

void loop() {
  client.loop();
  delay(1000);

  if (!client.connected()) {
    connect();
  }
}
