import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { SupabaseModule } from '../auth/supabase.module';
import { DevicesModule } from '../devices/devices.module';
import { TemperatureModule } from '../temperature/temperature.module';

@Module({
  imports: [SupabaseModule, DevicesModule, TemperatureModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
