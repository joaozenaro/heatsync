import {
  pgTable,
  serial,
  timestamp,
  varchar,
  real,
  index,
  text,
  boolean,
  uuid,
} from 'drizzle-orm/pg-core';

export const devices = pgTable(
  'devices',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ownerId: uuid('owner_id'),
    groupId: varchar('group_id', { length: 128 }),
  },
  (table) => [
    index('devices_owner_idx').on(table.ownerId),
    index('devices_group_idx').on(table.groupId),
  ],
);

export const temperatureReadings = pgTable(
  'temperature_readings',
  {
    id: serial('id').primaryKey(),
    takenAt: timestamp('taken_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    temperatureC: real('temperature_c').notNull(),
    humidity: real('humidity'),
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
