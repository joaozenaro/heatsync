import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TemperatureService } from './temperature.service';

@Injectable()
export class AggregationScheduler {
  constructor(private readonly temperatureService: TemperatureService) {}

  // Every minute: aggregate the last 15 minutes into 1-minute buckets
  @Cron(CronExpression.EVERY_MINUTE)
  async aggregateRecentMinutes() {
    const to = new Date();
    const from = new Date(to.getTime() - 15 * 60 * 1000);
    await this.temperatureService.aggregateAndStore('1m', from, to);
    await this.temperatureService.aggregateAndStore('5m', from, to);
  }

  // Every hour: aggregate the last 6 hours into 1h and 6h buckets
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateRecentHours() {
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 60 * 60 * 1000);
    await this.temperatureService.aggregateAndStore('1h', from, to);
    await this.temperatureService.aggregateAndStore('6h', from, to);
  }

  // Daily: aggregate the last 2 days into daily buckets
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDaily() {
    const to = new Date();
    const from = new Date(to.getTime() - 2 * 24 * 60 * 60 * 1000);
    await this.temperatureService.aggregateAndStore('1d', from, to);
  }
}
