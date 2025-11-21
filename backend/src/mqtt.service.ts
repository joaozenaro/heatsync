import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { TemperatureService } from './temperature/temperature.service';
import { DevicesService } from './devices/devices.service';
import { WebsocketGateway } from './websocket/websocket.gateway';

interface TemperatureMessage {
  temperature: number;
  humidity?: number;
  deviceId: string;
}

import { AlertsService } from './alerts/alerts.service';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly temperatureService: TemperatureService,
    private readonly devicesService: DevicesService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly alertsService: AlertsService,
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
      this.client.subscribe('heatsync/telemetry', (err) => {
        if (!err) {
          console.log('Subscribed to heatsync/telemetry');
        } else {
          console.error('Failed to subscribe:', err.message);
        }
      });
    });

    this.client.on('error', (error) => {
      console.error('MQTT connection error:', error);
    });

    this.client.on('message', (topic: string, payload: Buffer) => {
      if (topic === 'heatsync/telemetry') {
        const data = JSON.parse(payload.toString()) as TemperatureMessage;

        void (async () => {
          try {
            await this.temperatureService.saveIfChanged(
              data.temperature,
              data.deviceId,
              data.humidity,
            );

            await this.devicesService.updateLastSeen(data.deviceId);

            this.websocketGateway.broadcastTemperatureUpdate(
              data.deviceId,
              data.temperature,
              data.humidity,
            );

            await this.alertsService.checkAlerts(
              data.deviceId,
              data.temperature,
              data.humidity,
            );
          } catch (error) {
            console.error('Error processing temperature message:', error);
          }
        })();
      }
    });
  }
}
