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
  integer,
} from 'drizzle-orm/pg-core';

export const locations = pgTable(
  'locations',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 100 }).notNull(), // e.g., 'building', 'sector', 'floor', 'room'
    description: text('description'),
    parentId: integer('parent_id'),
    ownerId: uuid('owner_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('locations_parent_idx').on(table.parentId),
    index('locations_owner_idx').on(table.ownerId),
  ],
);

export const devices = pgTable(
  'devices',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    locationId: integer('location_id'),
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
    index('devices_location_idx').on(table.locationId),
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
    deviceTimestamp: timestamp('device_timestamp', { withTimezone: true }),
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

export const alerts = pgTable(
  'alerts',
  {
    id: serial('id').primaryKey(),
    deviceId: varchar('device_id', { length: 128 }).references(
      () => devices.id,
      { onDelete: 'cascade' },
    ),
    type: varchar('type', { length: 20 }).notNull(), // 'temperature' or 'humidity'
    minThreshold: real('min_threshold'),
    maxThreshold: real('max_threshold'),
    // Scheduling
    startTime: varchar('start_time', { length: 5 }), // HH:mm
    endTime: varchar('end_time', { length: 5 }), // HH:mm
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    daysOfWeek: integer('days_of_week').array(), // 0=Sunday, 6=Saturday
    // Notification
    emails: text('emails').array().notNull(),
    enabled: boolean('enabled').notNull().default(true),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('alerts_device_idx').on(table.deviceId)],
);
