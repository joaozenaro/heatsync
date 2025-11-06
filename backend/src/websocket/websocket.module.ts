import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { SupabaseModule } from '../auth/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [WebsocketGateway],
})
export class WebsocketModule {}
