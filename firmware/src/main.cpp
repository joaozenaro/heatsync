#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include "secrets.development.h"
#include <FS.h>
#include <time.h>

#define LED_BUILTIN 2
#define DHTPIN 4
#define DHTTYPE DHT11

#if USE_TLS
#include <WiFiClientSecure.h>
WiFiClientSecure espClient;
#else
WiFiClient espClient;
#endif

PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

void setup_wifi()
{
    delay(10);
    Serial.println();
    Serial.print("Connecting to ");
    Serial.println(ssid);

    WiFi.disconnect(true);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    // Set static DNS
    IPAddress dns(8, 8, 8, 8);
    WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, dns);

    Serial.println("");
    Serial.println("WiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
}

void reconnect()
{
    while (!client.connected())
    {
        Serial.print("Attempting MQTT connection...");
        if (client.connect("ESP32Client", mqtt_username, mqtt_password))
        {
            Serial.println("connected");
        }
        else
        {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            delay(5000);
        }
    }
}

void setDateTime()
{
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("Waiting for NTP time sync...");

    int retries = 0;
    const int maxRetries = 30; // ~30 seconds max wait
    time_t now = time(nullptr);

    while (now < 100000 && retries < maxRetries)
    {
        delay(500);
        Serial.print(".");
        now = time(nullptr);
        retries++;
    }

    Serial.println();
    if (now < 100000)
    {
        Serial.println("Failed to sync NTP time");
    }
    else
    {
        Serial.println("Time synced: " + String(ctime(&now)));
    }
}

void setup()
{
    pinMode(LED_BUILTIN, OUTPUT);
    Serial.begin(115200);
    dht.begin();
    setup_wifi();
    setDateTime();

#if USE_TLS
    espClient.setInsecure();
#endif

    client.setServer(mqtt_server, mqtt_port);
}

void loop()
{
    static unsigned long lastMsg = 0;
    if (!client.connected())
    {
        reconnect();
    }
    client.loop();

    unsigned long now = millis();
    if (now - lastMsg > reading_interval_millis)
    {
        lastMsg = now;
        float temperature = dht.readTemperature();
        if (!isnan(temperature))
        {
            String deviceId = WiFi.macAddress();
            String payload = "{\"temperature\":" + String(temperature) + ",\"deviceId\":\"" + deviceId + "\"}";
            client.publish("heatsync/temperature", payload.c_str());
            Serial.print("Published message: ");
            Serial.println(payload);
        }
        else
        {
            Serial.println("Failed to read temperature");
        }
    }
}
