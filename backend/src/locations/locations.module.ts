import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationDevicesService } from './location-devices.service';
import { LocationsController } from './locations.controller';
import { LocationDevicesController } from './location-devices.controller';
import { DbModule } from '../db/db.module';
import { SupabaseModule } from '../auth/supabase.module';

@Module({
  imports: [DbModule, SupabaseModule],
  controllers: [LocationsController, LocationDevicesController],
  providers: [LocationsService, LocationDevicesService],
  exports: [LocationsService, LocationDevicesService],
})
export class LocationsModule {}
