import { Injectable, NotFoundException } from '@nestjs/common';
import { DbClient } from '../db/client';
import { devices, locations } from '../db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

@Injectable()
export class LocationDevicesService {
  constructor(private readonly dbClient: DbClient) {}

  async getDevicesInLocation(
    locationId: number,
    userId: string,
  ): Promise<{ id: string; name: string; locationId: number | null }[]> {
    const locationIds = await this.getDescendantLocationIds(locationId, userId);

    const db = this.dbClient.db;
    const result = await db
      .select({
        id: devices.id,
        name: devices.name,
        locationId: devices.locationId,
      })
      .from(devices)
      .where(inArray(devices.locationId, locationIds));

    return result;
  }

  async moveDevices(
    deviceIds: string[],
    targetLocationId: number | null,
    userId: string,
  ): Promise<void> {
    const db = this.dbClient.db;

    const existingDevices = await db
      .select({ id: devices.id })
      .from(devices)
      .where(inArray(devices.id, deviceIds));

    if (existingDevices.length !== deviceIds.length) {
      throw new NotFoundException('One or more devices not found');
    }

    if (targetLocationId !== null) {
      const location = await db
        .select({ id: locations.id })
        .from(locations)
        .where(
          and(
            eq(locations.id, targetLocationId),
            eq(locations.ownerId, userId),
          ),
        )
        .limit(1);

      if (location.length === 0) {
        throw new NotFoundException(
          'Target location not found or access denied',
        );
      }
    }

    await db
      .update(devices)
      .set({
        locationId: targetLocationId,
        updatedAt: new Date(),
      })
      .where(inArray(devices.id, deviceIds));
  }

  private async getDescendantLocationIds(
    locationId: number,
    userId: string,
  ): Promise<number[]> {
    const db = this.dbClient.db;

    const result = await db.execute(sql`
      WITH RECURSIVE location_tree AS (
        -- Base case: the location itself
        SELECT id
        FROM "locations"
        WHERE "id" = ${locationId} AND "ownerId"::text = ${userId}
        
        UNION ALL
        
        -- Recursive case: all children
        SELECT l.id
        FROM "locations" l
        JOIN location_tree lt ON l."parentId" = lt.id
        WHERE l."ownerId"::text = ${userId}
      )
      SELECT id FROM location_tree;
    `);

    return result.rows.map((row: { id: string }) => parseInt(row.id, 10));
  }
}
