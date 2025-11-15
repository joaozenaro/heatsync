import { Injectable, NotFoundException } from '@nestjs/common';
import { DbClient } from '../db/client';
import { devices, locations } from '../db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

@Injectable()
export class LocationDevicesService {
  constructor(private readonly dbClient: DbClient) {}

  /**
   * Get all devices in a location and its sub-locations
   */
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
      .where(
        and(
          inArray(devices.locationId, locationIds),
          eq(devices.ownerId, userId),
        ),
      );

    return result;
  }

  /**
   * Move multiple devices to a new location
   */
  async moveDevices(
    deviceIds: string[],
    targetLocationId: number | null,
    userId: string,
  ): Promise<void> {
    const db = this.dbClient.db;

    // Verify all devices exist and belong to the user
    const existingDevices = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(inArray(devices.id, deviceIds), eq(devices.ownerId, userId)));

    if (existingDevices.length !== deviceIds.length) {
      throw new NotFoundException(
        'One or more devices not found or access denied',
      );
    }

    // Verify the target location exists and belongs to the user if provided
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

    // Update all devices
    await db
      .update(devices)
      .set({
        locationId: targetLocationId,
        updatedAt: new Date(),
      })
      .where(inArray(devices.id, deviceIds));
  }

  /**
   * Get all descendant location IDs for a given location
   */
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
