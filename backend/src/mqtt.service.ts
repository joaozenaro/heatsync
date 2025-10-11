import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { TemperatureService } from './temperature/temperature.service';

interface TemperatureMessage {
  temperature: number;
  deviceId: string;
}

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly temperatureService: TemperatureService,
  ) {}

  onModuleInit(): void {
    this.client = mqtt.connect({
      host: this.configService.get<string>('MQTT_HOST'),
      port: this.configService.get<number>('MQTT_PORT'),
      protocol: this.configService.get<string>('MQTT_PROTOCOL') as
        | 'mqtt'
        | 'mqtts',
      username: this.configService.get<string>('MQTT_USERNAME'),
      password: this.configService.get<string>('MQTT_PASSWORD'),
    });

    this.client.on('connect', () => {
      this.client.subscribe('heatsync/temperature', (err) => {
        if (!err) {
          console.log('Subscribed to heatsync/temperature');
        } else {
          console.error('Failed to subscribe:', err.message);
        }
      });
    });

    this.client.on('error', (error) => {
      console.error('MQTT connection error:', error);
    });

    this.client.on('message', (topic: string, payload: Buffer) => {
      if (topic === 'heatsync/temperature') {
        const data = JSON.parse(payload.toString()) as TemperatureMessage;
        void this.temperatureService.saveIfChanged(
          data.temperature,
          data.deviceId,
        );
      }
    });
  }
}
