import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { DbClient } from '../db/client';
import { temperatureReadings, temperatureAggregates } from '../db/schema';

export interface TemperatureReading {
  id: number;
  takenAt: Date;
  temperatureC: number;
  humidity?: number | null;
  deviceId: string | null;
}

export interface TemperatureAggregate {
  id: number;
  bucketStart: Date;
  granularity: string;
  medianC: number;
  deviceId: string | null;
}

export interface DeviceStats {
  deviceId: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  avgHumidity: number | null;
  readingCount: number;
}

@Injectable()
export class TemperatureService {
  constructor(private readonly dbClient: DbClient) {}

  async saveIfChanged(
    temperature: number,
    deviceId: string,
    humidity?: number,
  ) {
    const db = this.dbClient.db;

    const last = await db
      .select({
        id: temperatureReadings.id,
        temperatureC: temperatureReadings.temperatureC,
        humidity: temperatureReadings.humidity,
      })
      .from(temperatureReadings)
      .where(eq(temperatureReadings.deviceId, deviceId))
      .orderBy(desc(temperatureReadings.takenAt))
      .limit(1);

    const lastValue = last[0]?.temperatureC
      ? Number(last[0].temperatureC)
      : null;
    const lastHumidity = last[0]?.humidity ? Number(last[0].humidity) : null;

    const tempChanged =
      lastValue === null ||
      Number(lastValue.toFixed(2)) !== Number(temperature.toFixed(2));
    const humidityChanged =
      humidity !== undefined &&
      (lastHumidity === null ||
        Number(lastHumidity.toFixed(2)) !== Number(humidity.toFixed(2)));

    if (!tempChanged && !humidityChanged) {
      return; // unchanged within 0.01 precision
    }

    await db.insert(temperatureReadings).values({
      temperatureC: temperature,
      humidity: humidity ?? null,
      deviceId,
    });
  }
  async aggregateAndStore(
    granularity: '1m' | '5m' | '1h' | '6h' | '1d',
    from: Date,
    to: Date,
  ) {
    const db = this.dbClient.db;

    const dateTrunc: Record<typeof granularity, string> = {
      '1m': 'minute',
      '5m': 'minute',
      '1h': 'hour',
      '6h': 'hour',
      '1d': 'day',
    } as const;

    const bucketStart =
      granularity === '5m'
        ? sql<Date>`timestamptz 'epoch' + floor(extract(epoch from ${temperatureReadings.takenAt}) / 300) * 300 * interval '1 second'`
        : granularity === '6h'
          ? sql<Date>`timestamptz 'epoch' + floor(extract(epoch from ${temperatureReadings.takenAt}) / 21600) * 21600 * interval '1 second'`
          : sql<Date>`date_trunc(${sql.raw(`'${dateTrunc[granularity]}'`)}, ${temperatureReadings.takenAt})::timestamptz`;

    const deviceIdsResult = await db
      .selectDistinct({ deviceId: temperatureReadings.deviceId })
      .from(temperatureReadings)
      .where(
        and(
          gte(
            temperatureReadings.takenAt,
            sql`${from.toISOString()}::timestamptz`,
          ),
          lte(
            temperatureReadings.takenAt,
            sql`${to.toISOString()}::timestamptz`,
          ),
        ),
      );

    const deviceIds = deviceIdsResult.map((r) => r.deviceId);

    for (const deviceId of deviceIds) {
      const where = and(
        gte(
          temperatureReadings.takenAt,
          sql`${from.toISOString()}::timestamptz`,
        ),
        lte(temperatureReadings.takenAt, sql`${to.toISOString()}::timestamptz`),
        deviceId
          ? eq(temperatureReadings.deviceId, deviceId)
          : isNull(temperatureReadings.deviceId),
      );

      const rows = await db
        .select({
          bucketStart: sql<string>`(${bucketStart})::timestamptz::text`,
          median: sql<number>`percentile_cont(0.5) within group (order by ${temperatureReadings.temperatureC}::float4)`,
        })
        .from(temperatureReadings)
        .where(where)
        .groupBy(bucketStart)
        .orderBy(bucketStart);

      if (rows.length === 0) continue;

      const values = rows.map((r) => ({
        bucketStart: new Date(r.bucketStart),
        granularity,
        medianC: r.median,
        deviceId,
      }));

      await db
        .delete(temperatureAggregates)
        .where(
          and(
            gte(
              temperatureAggregates.bucketStart,
              sql`${from.toISOString()}::timestamptz`,
            ),
            lte(
              temperatureAggregates.bucketStart,
              sql`${to.toISOString()}::timestamptz`,
            ),
            eq(temperatureAggregates.granularity, granularity),
            deviceId
              ? eq(temperatureAggregates.deviceId, deviceId)
              : isNull(temperatureAggregates.deviceId),
          ),
        );

      await db.insert(temperatureAggregates).values(values);
    }
  }

  async getLatestReadings(
    deviceIds?: string[],
    limit = 100,
  ): Promise<TemperatureReading[]> {
    const db = this.dbClient.db;

    const baseQuery = db
      .select({
        id: temperatureReadings.id,
        takenAt: temperatureReadings.takenAt,
        temperatureC: temperatureReadings.temperatureC,
        humidity: temperatureReadings.humidity,
        deviceId: temperatureReadings.deviceId,
      })
      .from(temperatureReadings);

    let result;
    if (deviceIds && deviceIds.length > 0) {
      result = await baseQuery
        .where(sql`${temperatureReadings.deviceId} = ANY(${deviceIds})`)
        .orderBy(desc(temperatureReadings.takenAt))
        .limit(limit);
    } else {
      result = await baseQuery
        .orderBy(desc(temperatureReadings.takenAt))
        .limit(limit);
    }

    return result as TemperatureReading[];
  }

  async getLatestByDevice(
    deviceId: string,
  ): Promise<TemperatureReading | null> {
    const db = this.dbClient.db;

    const result = await db
      .select({
        id: temperatureReadings.id,
        takenAt: temperatureReadings.takenAt,
        temperatureC: temperatureReadings.temperatureC,
        humidity: temperatureReadings.humidity,
        deviceId: temperatureReadings.deviceId,
      })
      .from(temperatureReadings)
      .where(eq(temperatureReadings.deviceId, deviceId))
      .orderBy(desc(temperatureReadings.takenAt))
      .limit(1);

    return result[0] ? (result[0] as TemperatureReading) : null;
  }

  async getReadingsInRange(
    deviceId: string,
    from: Date,
    to: Date,
    limit = 1000,
  ): Promise<TemperatureReading[]> {
    const db = this.dbClient.db;

    const result = await db
      .select({
        id: temperatureReadings.id,
        takenAt: temperatureReadings.takenAt,
        temperatureC: temperatureReadings.temperatureC,
        humidity: temperatureReadings.humidity,
        deviceId: temperatureReadings.deviceId,
      })
      .from(temperatureReadings)
      .where(
        and(
          eq(temperatureReadings.deviceId, deviceId),
          gte(
            temperatureReadings.takenAt,
            sql`${from.toISOString()}::timestamptz`,
          ),
          lte(
            temperatureReadings.takenAt,
            sql`${to.toISOString()}::timestamptz`,
          ),
        ),
      )
      .orderBy(desc(temperatureReadings.takenAt))
      .limit(limit);

    return result as TemperatureReading[];
  }

  async getAggregates(
    deviceId: string,
    granularity: '1m' | '5m' | '1h' | '6h' | '1d',
    from: Date,
    to: Date,
    limit = 1000,
  ): Promise<TemperatureAggregate[]> {
    const db = this.dbClient.db;

    const result = await db
      .select({
        id: temperatureAggregates.id,
        bucketStart: temperatureAggregates.bucketStart,
        granularity: temperatureAggregates.granularity,
        medianC: temperatureAggregates.medianC,
        deviceId: temperatureAggregates.deviceId,
      })
      .from(temperatureAggregates)
      .where(
        and(
          eq(temperatureAggregates.deviceId, deviceId),
          eq(temperatureAggregates.granularity, granularity),
          gte(
            temperatureAggregates.bucketStart,
            sql`${from.toISOString()}::timestamptz`,
          ),
          lte(
            temperatureAggregates.bucketStart,
            sql`${to.toISOString()}::timestamptz`,
          ),
        ),
      )
      .orderBy(desc(temperatureAggregates.bucketStart))
      .limit(limit);

    return result as TemperatureAggregate[];
  }

  async getDeviceStats(
    deviceId: string,
    from: Date,
    to: Date,
  ): Promise<DeviceStats | null> {
    const db = this.dbClient.db;

    const result = await db
      .select({
        deviceId: temperatureReadings.deviceId,
        avgTemp: sql<number>`AVG(${temperatureReadings.temperatureC})::float4`,
        minTemp: sql<number>`MIN(${temperatureReadings.temperatureC})::float4`,
        maxTemp: sql<number>`MAX(${temperatureReadings.temperatureC})::float4`,
        avgHumidity: sql<
          number | null
        >`AVG(${temperatureReadings.humidity})::float4`,
        readingCount: sql<number>`COUNT(*)::int`,
      })
      .from(temperatureReadings)
      .where(
        and(
          eq(temperatureReadings.deviceId, deviceId),
          gte(
            temperatureReadings.takenAt,
            sql`${from.toISOString()}::timestamptz`,
          ),
          lte(
            temperatureReadings.takenAt,
            sql`${to.toISOString()}::timestamptz`,
          ),
        ),
      )
      .groupBy(temperatureReadings.deviceId);

    return result[0] ? (result[0] as DeviceStats) : null;
  }

  async getAllDevicesStats(from: Date, to: Date): Promise<DeviceStats[]> {
    const db = this.dbClient.db;

    const result = await db
      .select({
        deviceId: temperatureReadings.deviceId,
        avgTemp: sql<number>`AVG(${temperatureReadings.temperatureC})::float4`,
        minTemp: sql<number>`MIN(${temperatureReadings.temperatureC})::float4`,
        maxTemp: sql<number>`MAX(${temperatureReadings.temperatureC})::float4`,
        avgHumidity: sql<
          number | null
        >`AVG(${temperatureReadings.humidity})::float4`,
        readingCount: sql<number>`COUNT(*)::int`,
      })
      .from(temperatureReadings)
      .where(
        and(
          gte(
            temperatureReadings.takenAt,
            sql`${from.toISOString()}::timestamptz`,
          ),
          lte(
            temperatureReadings.takenAt,
            sql`${to.toISOString()}::timestamptz`,
          ),
        ),
      )
      .groupBy(temperatureReadings.deviceId);

    return result as DeviceStats[];
  }
}
