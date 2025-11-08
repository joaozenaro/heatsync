import { Injectable } from '@nestjs/common';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { DbClient } from '../db/client';
import { devices } from '../db/schema';

export interface Device {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
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
  location?: string;
  ownerId?: string;
  groupId?: string;
}

export interface UpdateDeviceDto {
  name?: string;
  description?: string;
  location?: string;
  isActive?: boolean;
  groupId?: string;
}

@Injectable()
export class DevicesService {
  constructor(private readonly dbClient: DbClient) {}

  async findAll(userId?: string): Promise<Device[]> {
    const db = this.dbClient.db;

    // If userId is provided, filter by owner
    const whereClause = userId
      ? eq(devices.ownerId, userId)
      : isNull(devices.ownerId);

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

  async findById(deviceId: string): Promise<Device | null> {
    const db = this.dbClient.db;

    const result = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId))
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
        location: dto.location || null,
        ownerId: dto.ownerId || null,
        groupId: dto.groupId || null,
      })
      .returning();

    return result[0] as Device;
  }

  async update(deviceId: string, dto: UpdateDeviceDto): Promise<Device> {
    const db = this.dbClient.db;

    const result = await db
      .update(devices)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId))
      .returning();

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

  async delete(deviceId: string): Promise<void> {
    const db = this.dbClient.db;

    await db.delete(devices).where(eq(devices.id, deviceId));
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
}
