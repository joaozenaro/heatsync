import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../auth/ws-auth.guard';
import { SupabaseService } from '../auth/supabase.service';
import { User } from '@supabase/supabase-js';
import { DevicesService, Device } from '../devices/devices.service';
import { TemperatureService } from '../temperature/temperature.service';
import { LocationsService } from '../locations/locations.service';

interface SocketAuth {
  token?: string;
}

export interface AuthenticatedSocket extends Socket {
  handshake: Socket['handshake'] & { auth: SocketAuth };
  data: {
    user?: User;
    subscribedDevices?: Set<string>;
  };
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebsocketGateway');

  constructor(
    private supabaseService: SupabaseService,
    private devicesService: DevicesService,
    private temperatureService: TemperatureService,
    private locationsService: LocationsService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client attempting to connect: ${client.id}`);

    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: No token provided`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    try {
      const user = await this.supabaseService.verifyToken(token);

      if (!user) {
        this.logger.warn(`Client ${client.id} rejected: Invalid token`);
        client.emit('error', { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }

      client.data.user = user;
      client.data.subscribedDevices = new Set<string>();
      this.logger.log(
        `Client connected: ${client.id} (User: ${user.email || user.id})`,
      );

      client.emit('authenticated', {
        message: 'Successfully authenticated',
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error: any) {
      this.logger.error(`Client ${client.id} authentication error: ${error}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userEmail = client.data.user?.email || 'Unknown';
    this.logger.log(`Client disconnected: ${client.id} (User: ${userEmail})`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    this.logger.log(
      `Ping received from ${client.id} (User: ${client.data.user?.email})`,
    );
    return {
      event: 'pong',
      data: {
        message: 'pong',
        timestamp: new Date().toISOString(),
        user: {
          id: client.data.user?.id,
          email: client.data.user?.email,
        },
      },
    };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { text: string },
  ) {
    this.logger.log(
      `Message from ${client.id} (User: ${client.data.user?.email}): ${payload.text}`,
    );

    return {
      event: 'message',
      data: {
        text: `Echo: ${payload.text}`,
        from: client.data.user?.email,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getTemperature')
  handleGetTemperature(@ConnectedSocket() client: AuthenticatedSocket) {
    this.logger.log(
      `Temperature request from ${client.id} (User: ${client.data.user?.email})`,
    );

    return {
      event: 'temperature',
      data: {
        value: Math.random() * 30 + 15, // Random temp between 15-45°C
        unit: 'celsius',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('devices:list')
  async handleListDevices(@ConnectedSocket() client: AuthenticatedSocket) {
    this.logger.log(
      `Devices list request from ${client.id} (User: ${client.data.user?.email})`,
    );

    try {
      const userId = client.data.user?.id;
      const devices = await this.devicesService.findAllActive();

      const devicesWithTemp = await Promise.all(
        devices.map(async (device) => {
          const latestReading = await this.temperatureService.getLatestByDevice(
            device.id,
          );

          // Fetch location information if device has a locationId
          let location = null;
          if (device.locationId && userId) {
            try {
              location = await this.locationsService.findById(
                device.locationId,
                userId,
              );
            } catch {
              // Location not found or access denied
            }
          }

          return {
            ...device,
            currentTemperature: latestReading?.temperatureC || null,
            currentHumidity: latestReading?.humidity || null,
            lastReading: latestReading?.takenAt || null,
            location: location
              ? {
                  id: location.id,
                  name: location.name,
                  type: location.type,
                  description: location.description,
                }
              : null,
          };
        }),
      );

      return {
        event: 'devices:list',
        data: devicesWithTemp,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching devices: ${errorMessage}`);
      return {
        event: 'error',
        data: { message: 'Failed to fetch devices' },
      };
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('devices:subscribe')
  async handleSubscribeToDevices(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { deviceIds: string[] },
  ) {
    this.logger.log(
      `Device subscription from ${client.id}: ${payload.deviceIds.join(', ')}`,
    );

    client.data.subscribedDevices = new Set(payload.deviceIds);

    try {
      const readings = await Promise.all(
        payload.deviceIds.map(async (deviceId) => {
          const latest =
            await this.temperatureService.getLatestByDevice(deviceId);
          return latest;
        }),
      );

      const validReadings = readings.filter((r) => r !== null);

      return {
        event: 'temperature:initial',
        data: validReadings,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching initial temperatures: ${errorMessage}`);
      return {
        event: 'error',
        data: { message: 'Failed to fetch initial temperatures' },
      };
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('devices:unsubscribe')
  handleUnsubscribeFromDevices(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { deviceIds: string[] },
  ) {
    this.logger.log(
      `Device unsubscription from ${client.id}: ${payload.deviceIds.join(', ')}`,
    );

    payload.deviceIds.forEach((deviceId) => {
      client.data.subscribedDevices?.delete(deviceId);
    });

    return {
      event: 'devices:unsubscribed',
      data: { deviceIds: payload.deviceIds },
    };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('temperature:history')
  async handleGetTemperatureHistory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { deviceId: string; from: string; to: string },
  ) {
    this.logger.log(
      `Temperature history request from ${client.id} for device ${payload.deviceId}`,
    );

    try {
      const from = new Date(payload.from);
      const to = new Date(payload.to);

      const readings = await this.temperatureService.getReadingsInRange(
        payload.deviceId,
        from,
        to,
      );

      return {
        event: 'temperature:history',
        data: {
          deviceId: payload.deviceId,
          readings,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching temperature history: ${errorMessage}`);
      return {
        event: 'error',
        data: { message: 'Failed to fetch temperature history' },
      };
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('stats:request')
  async handleGetStats(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { from?: string; to?: string },
  ) {
    this.logger.log(
      `Stats request from ${client.id} (User: ${client.data.user?.email})`,
    );

    try {
      const to = payload.to ? new Date(payload.to) : new Date();
      const from = payload.from
        ? new Date(payload.from)
        : new Date(to.getTime() - 24 * 60 * 60 * 1000); // Last 24h by default

      const stats = await this.temperatureService.getAllDevicesStats(from, to);

      return {
        event: 'stats:data',
        data: stats,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching stats: ${errorMessage}`);
      return {
        event: 'error',
        data: { message: 'Failed to fetch statistics' },
      };
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('aggregates:request')
  async handleGetAggregates(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      deviceId: string;
      granularity: '1m' | '5m' | '1h' | '6h' | '1d';
      from: string;
      to: string;
    },
  ) {
    this.logger.log(
      `Aggregates request from ${client.id} for device ${payload.deviceId}`,
    );

    try {
      const from = new Date(payload.from);
      const to = new Date(payload.to);

      const aggregates = await this.temperatureService.getAggregates(
        payload.deviceId,
        payload.granularity,
        from,
        to,
      );

      return {
        event: 'aggregates:data',
        data: {
          deviceId: payload.deviceId,
          granularity: payload.granularity,
          aggregates,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching aggregates: ${errorMessage}`);
      return {
        event: 'error',
        data: { message: 'Failed to fetch aggregates' },
      };
    }
  }

  broadcastTemperatureUpdate(
    deviceId: string,
    temperature: number,
    humidity?: number,
  ) {
    const clients = Array.from(
      this.server.sockets.sockets.values(),
    ) as AuthenticatedSocket[];

    clients.forEach((client) => {
      if (client.data.subscribedDevices?.has(deviceId)) {
        client.emit('temperature:update', {
          deviceId,
          temperatureC: temperature,
          humidity: humidity ?? null,
          timestamp: new Date().toISOString(),
        });
      }
    });

    this.logger.debug(
      `Broadcasted temperature update for device ${deviceId}: ${temperature}°C${humidity !== undefined ? `, ${humidity}%` : ''}`,
    );
  }

  broadcastDeviceAdded(device: Device) {
    this.server.emit('device:added', device);
    this.logger.log(`Broadcasted device:added for ${device.id}`);
  }

  broadcastDeviceUpdated(device: Device) {
    this.server.emit('device:updated', device);
    this.logger.log(`Broadcasted device:updated for ${device.id}`);
  }

  broadcastDeviceRemoved(deviceId: string) {
    this.server.emit('device:removed', { deviceId });
    this.logger.log(`Broadcasted device:removed for ${deviceId}`);
  }

  broadcastDeviceStatus(deviceId: string, isActive: boolean) {
    this.server.emit('device:status', { deviceId, isActive });
    this.logger.log(
      `Broadcasted device:status for ${deviceId}: ${isActive ? 'active' : 'inactive'}`,
    );
  }

  broadcastHumidityUpdate(deviceId: string, humidity: number) {
    const clients = Array.from(
      this.server.sockets.sockets.values(),
    ) as AuthenticatedSocket[];

    clients.forEach((client) => {
      if (client.data.subscribedDevices?.has(deviceId)) {
        client.emit('data:humidity', {
          deviceId,
          humidity,
          timestamp: new Date().toISOString(),
        });
      }
    });

    this.logger.debug(
      `Broadcasted humidity update for device ${deviceId}: ${humidity}%`,
    );
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    const token = client.handshake.auth?.token;
    if (token) return token;

    const authHeader = client.handshake.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.substring(7);
    }

    return null;
  }
}
