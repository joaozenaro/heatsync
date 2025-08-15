#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

#define LED_BUILTIN 2
#define DHTPIN 4         // GPIO D4
#define DHTTYPE DHT11    // DHT11 Sensor

const char* ssid = "ssid";
const char* password = "password";

WebServer server(80);
DHT dht(DHTPIN, DHTTYPE);

String ledState = "OFF";

String getHTML() {
    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<title>ESP32 LED & Temp</title>";
    html += "<script>";
    html += "setInterval(function(){ fetch('/temp').then(response => response.text()).then(data => { document.getElementById('temp').innerText = data + ' °C'; }); }, 2000);";
    html += "</script></head><body>";
    html += "<p>LED status: <strong>" + ledState + "</strong></p>";
    html += "<p><a href='/on'><button style='padding:20px;font-size:16px;'>Turn ON</button></a></p>";
    html += "<p><a href='/off'><button style='padding:20px;font-size:16px;'>Turn OFF</button></a></p>";
    html += "<hr>";
    html += "<p>Temperature: <strong id='temp'>Loading...</strong></p>";
    html += "</body></html>";
    return html;
}

void handleRoot() {
    server.send(200, "text/html", getHTML());
}

void handleOn() {
    digitalWrite(LED_BUILTIN, HIGH);
    ledState = "ON";
    handleRoot();
}

void handleOff() {
    digitalWrite(LED_BUILTIN, LOW);
    ledState = "OFF";
    handleRoot();
}

void handleTemp() {
    float temperature = dht.readTemperature();
    if (isnan(temperature)) {
        server.send(200, "text/plain", "Error");
    } else {
        server.send(200, "text/plain", String(temperature));
    }
}

void setup() {
    pinMode(LED_BUILTIN, OUTPUT);
    Serial.begin(115200);
    dht.begin();

    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nConnected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

    server.on("/", handleRoot);
    server.on("/on", handleOn);
    server.on("/off", handleOff);
    server.on("/temp", handleTemp);
    server.begin();
}

void loop() {
    server.handleClient();
}
