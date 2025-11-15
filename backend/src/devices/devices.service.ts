import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, and, isNull, inArray, sql } from 'drizzle-orm';
import { DbClient } from '../db/client';
import { devices } from '../db/schema';

export interface Device {
  id: string;
  name: string;
  description: string | null;
  locationId: number | null;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string | null;
  groupId: string | null;
}

export interface CreateDeviceDto {
  id: string;
  name: string;
  description?: string;
  locationId?: number;
  ownerId?: string;
  groupId?: string;
}

export interface UpdateDeviceDto {
  name?: string;
  description?: string;
  locationId?: number;
  isActive?: boolean;
  groupId?: string;
}

@Injectable()
export class DevicesService {
  constructor(private readonly dbClient: DbClient) {}

  async findAll(userId?: string, locationId?: number): Promise<Device[]> {
    const db = this.dbClient.db;

    const conditions = [];

    if (userId) {
      conditions.push(eq(devices.ownerId, userId));
    } else {
      conditions.push(isNull(devices.ownerId));
    }

    if (locationId) {
      const locationIds = await this.getDescendantLocationIds(
        locationId,
        userId,
      );
      conditions.push(inArray(devices.locationId, locationIds));
    }

    const whereClause =
      conditions.length > 1 ? and(...conditions) : conditions[0] || undefined;

    const result = await db
      .select()
      .from(devices)
      .where(whereClause)
      .orderBy(desc(devices.lastSeenAt));

    return result as Device[];
  }

  async findAllActive(userId?: string): Promise<Device[]> {
    const db = this.dbClient.db;

    const whereClause = userId
      ? and(eq(devices.ownerId, userId), eq(devices.isActive, true))
      : eq(devices.isActive, true);

    const result = await db
      .select()
      .from(devices)
      .where(whereClause)
      .orderBy(desc(devices.lastSeenAt));

    return result as Device[];
  }

  async findById(deviceId: string, userId?: string): Promise<Device | null> {
    const db = this.dbClient.db;

    const conditions = [eq(devices.id, deviceId)];

    if (userId) {
      conditions.push(eq(devices.ownerId, userId));
    }

    const result = await db
      .select()
      .from(devices)
      .where(and(...conditions))
      .limit(1);

    return result[0] ? (result[0] as Device) : null;
  }

  async create(dto: CreateDeviceDto): Promise<Device> {
    const db = this.dbClient.db;

    const result = await db
      .insert(devices)
      .values({
        id: dto.id,
        name: dto.name,
        description: dto.description || null,
        locationId: dto.locationId || null,
        ownerId: dto.ownerId || null,
        groupId: dto.groupId || null,
      })
      .returning();

    return result[0] as Device;
  }

  async update(
    deviceId: string,
    dto: UpdateDeviceDto,
    userId?: string,
  ): Promise<Device> {
    const db = this.dbClient.db;

    const conditions = [eq(devices.id, deviceId)];

    if (userId) {
      conditions.push(eq(devices.ownerId, userId));
    }

    const result = await db
      .update(devices)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    if (!result[0]) {
      throw new NotFoundException('Device not found or access denied');
    }

    return result[0] as Device;
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    const db = this.dbClient.db;

    const existing = await this.findById(deviceId);

    if (!existing) {
      await this.create({
        id: deviceId,
        name: `Device ${deviceId}`,
        description: 'Auto-created device',
      });
    } else {
      await db
        .update(devices)
        .set({
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(devices.id, deviceId));
    }
  }

  async delete(deviceId: string, userId?: string): Promise<void> {
    const db = this.dbClient.db;

    const conditions = [eq(devices.id, deviceId)];

    if (userId) {
      conditions.push(eq(devices.ownerId, userId));
    }

    const result = await db
      .delete(devices)
      .where(and(...conditions))
      .returning({ id: devices.id });

    if (result.length === 0) {
      throw new NotFoundException('Device not found or access denied');
    }
  }

  async findByGroup(groupId: string): Promise<Device[]> {
    const db = this.dbClient.db;

    const result = await db
      .select()
      .from(devices)
      .where(eq(devices.groupId, groupId))
      .orderBy(desc(devices.lastSeenAt));

    return result as Device[];
  }

  private async getDescendantLocationIds(
    locationId: number,
    userId?: string,
  ): Promise<number[]> {
    const db = this.dbClient.db;

    const result = await db.execute(sql`
      WITH RECURSIVE location_tree AS (
        -- Base case: the location itself
        SELECT id
        FROM "locations"
        WHERE "id" = ${locationId}
        ${userId ? sql`AND "ownerId"::text = ${userId}` : sql``}
        
        UNION ALL
        
        -- Recursive case: all children
        SELECT l.id
        FROM "locations" l
        JOIN location_tree lt ON l."parentId" = lt.id
        ${userId ? sql`WHERE l."ownerId"::text = ${userId}` : sql``}
      )
      SELECT id FROM location_tree;
    `);

    return result.rows.map((row: { id: string }) => parseInt(row.id, 10));
  }
}
