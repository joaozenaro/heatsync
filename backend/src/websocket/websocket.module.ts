import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { SupabaseModule } from '../auth/supabase.module';
import { DevicesModule } from '../devices/devices.module';
import { TemperatureModule } from '../temperature/temperature.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [SupabaseModule, DevicesModule, TemperatureModule, LocationsModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
