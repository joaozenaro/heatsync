import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private latestTemperature: string | null = null;

  onModuleInit(): void {
    this.client = mqtt.connect('mqtt://localhost:1884');

    this.client.on('connect', () => {
      this.client.subscribe('heatsync/temperature', (err) => {
        if (!err) {
          console.log('Subscribed to heatsync/temperature');
        } else {
          console.error('Failed to subscribe:', err.message);
        }
      });
    });

    this.client.on('message', (topic: string, message: Buffer) => {
      if (topic === 'heatsync/temperature') {
        this.latestTemperature = message.toString();
        console.log(`Received temperature: ${this.latestTemperature}`);
      }
    });
  }

  getLatestTemperature(): string | null {
    return this.latestTemperature;
  }
}
