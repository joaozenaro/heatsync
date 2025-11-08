import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

interface SocketAuth {
  token?: string;
}

interface AuthenticatedSocket extends Socket {
  handshake: Socket['handshake'] & {
    auth: SocketAuth;
  };
  data: {
    user?: User;
  };
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const token = this.extractTokenFromHandshake(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const user: User | null = await this.supabaseService.verifyToken(token);

      if (!user) {
        throw new WsException('Unauthorized: Invalid token');
      }

      client.data.user = user;
      return true;
    } catch {
      throw new WsException('Unauthorized: Token verification failed');
    }
  }

  private extractTokenFromHandshake(
    client: AuthenticatedSocket,
  ): string | null {
    // Token via auth object in handshake
    if (client.handshake.auth?.token) return client.handshake.auth.token;

    // Token via Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);

    return null;
  }
}
