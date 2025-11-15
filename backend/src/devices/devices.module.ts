import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DbModule } from '../db/db.module';
import { SupabaseModule } from '../auth/supabase.module';

@Module({
  imports: [DbModule, SupabaseModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
