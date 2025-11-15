import { Injectable } from '@nestjs/common';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { DbClient } from '../db/client';
import { locations, devices } from '../db/schema';

export interface Location {
  id: number;
  name: string;
  type: string;
  description: string | null;
  parentId: number | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationDto {
  name: string;
  type: string;
  description?: string;
  parentId?: number;
  ownerId: string;
}

export interface UpdateLocationDto {
  name?: string;
  type?: string;
  description?: string;
  parentId?: number;
}

export interface LocationTreeNode extends Location {
  children: LocationTreeNode[];
}

@Injectable()
export class LocationsService {
  constructor(private readonly dbClient: DbClient) {}

  async findAll(userId: string): Promise<Location[]> {
    const db = this.dbClient.db;

    const result = await db
      .select()
      .from(locations)
      .where(eq(locations.ownerId, userId));

    return result as Location[];
  }

  async findById(locationId: number, userId: string): Promise<Location | null> {
    const db = this.dbClient.db;

    const result = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.ownerId, userId)))
      .limit(1);

    return result[0] ? (result[0] as Location) : null;
  }

  async findByParent(
    parentId: number | null,
    userId: string,
  ): Promise<Location[]> {
    const db = this.dbClient.db;

    const whereClause = parentId
      ? and(eq(locations.parentId, parentId), eq(locations.ownerId, userId))
      : and(isNull(locations.parentId), eq(locations.ownerId, userId));

    const result = await db.select().from(locations).where(whereClause);

    return result as Location[];
  }

  async getTree(userId: string): Promise<LocationTreeNode[]> {
    const allLocations = await this.findAll(userId);

    const locationMap = new Map<number, LocationTreeNode>();
    allLocations.forEach((loc) => {
      locationMap.set(loc.id, { ...loc, children: [] });
    });

    const roots: LocationTreeNode[] = [];
    locationMap.forEach((node) => {
      if (node.parentId === null) {
        roots.push(node);
      } else {
        const parent = locationMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return roots;
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    const db = this.dbClient.db;

    if (dto.parentId) {
      const parent = await this.findById(dto.parentId, dto.ownerId);
      if (!parent) {
        throw new Error('Parent location not found');
      }
    }

    const result = await db
      .insert(locations)
      .values({
        name: dto.name,
        type: dto.type,
        description: dto.description || null,
        parentId: dto.parentId || null,
        ownerId: dto.ownerId,
      })
      .returning();

    return result[0] as Location;
  }

  async update(
    locationId: number,
    userId: string,
    dto: UpdateLocationDto,
  ): Promise<Location> {
    const db = this.dbClient.db;

    const existing = await this.findById(locationId, userId);
    if (!existing) {
      throw new Error('Location not found');
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === locationId) {
        throw new Error('Location cannot be its own parent');
      }
      if (dto.parentId !== null) {
        const parent = await this.findById(dto.parentId, userId);
        if (!parent) {
          throw new Error('Parent location not found');
        }

        if (
          await this.wouldCreateCircularReference(
            locationId,
            dto.parentId,
            userId,
          )
        ) {
          throw new Error('Cannot create circular reference');
        }
      }
    }

    const result = await db
      .update(locations)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(and(eq(locations.id, locationId), eq(locations.ownerId, userId)))
      .returning();

    return result[0] as Location;
  }

  async delete(locationId: number, userId: string): Promise<void> {
    const db = this.dbClient.db;

    const children = await this.findByParent(locationId, userId);
    if (children.length > 0) {
      throw new Error('Cannot delete location with children');
    }

    // Unassign all devices from this location before deleting
    await db
      .update(devices)
      .set({
        locationId: null,
        updatedAt: new Date(),
      })
      .where(eq(devices.locationId, locationId));

    await db
      .delete(locations)
      .where(and(eq(locations.id, locationId), eq(locations.ownerId, userId)));
  }

  async getDeviceCount(locationId: number): Promise<number> {
    const db = this.dbClient.db;

    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(devices)
      .where(eq(devices.locationId, locationId));

    return result[0]?.count || 0;
  }

  private async wouldCreateCircularReference(
    locationId: number,
    newParentId: number,
    userId: string,
  ): Promise<boolean> {
    let currentId: number | null = newParentId;

    while (currentId !== null) {
      if (currentId === locationId) {
        return true;
      }

      const current = await this.findById(currentId, userId);
      if (!current) {
        break;
      }

      currentId = current.parentId;
    }

    return false;
  }
}
