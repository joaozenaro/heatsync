import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
