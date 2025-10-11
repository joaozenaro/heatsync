import {
  pgTable,
  serial,
  timestamp,
  varchar,
  real,
  index,
} from 'drizzle-orm/pg-core';

export const temperatureReadings = pgTable(
  'temperature_readings',
  {
    id: serial('id').primaryKey(),
    takenAt: timestamp('taken_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    temperatureC: real('temperature_c').notNull(),
    deviceId: varchar('device_id', { length: 128 }),
  },
  (table) => [index('temperature_readings_taken_at_idx').on(table.takenAt)],
);

export const temperatureAggregates = pgTable(
  'temperature_aggregates',
  {
    id: serial('id').primaryKey(),
    bucketStart: timestamp('bucket_start', { withTimezone: true }).notNull(),
    // granularity label like '1m', '5m', '1h', '6h', '1d'
    granularity: varchar('granularity', { length: 8 }).notNull(),
    medianC: real('median_c').notNull(),
    deviceId: varchar('device_id', { length: 128 }),
  },
  (table) => [
    index('temperature_aggregates_bucket_idx').on(
      table.granularity,
      table.bucketStart,
    ),
  ],
);
