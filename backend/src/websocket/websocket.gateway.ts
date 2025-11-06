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

interface SocketAuth {
  token?: string;
}

export interface AuthenticatedSocket extends Socket {
  handshake: Socket['handshake'] & { auth: SocketAuth };
  data: { user?: User };
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

  constructor(private supabaseService: SupabaseService) {}

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
