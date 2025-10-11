import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from '../db/db.module';
import { TemperatureService } from './temperature.service';
import { AggregationScheduler } from './aggregation.scheduler';

@Module({
  imports: [DbModule, ScheduleModule.forRoot()],
  providers: [TemperatureService, AggregationScheduler],
  exports: [TemperatureService],
})
export class TemperatureModule {}
