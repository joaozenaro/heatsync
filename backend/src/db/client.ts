import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

@Injectable()
export class DbClient implements OnModuleInit {
  private pool!: Pool;
  private _db = null as ReturnType<typeof drizzle> | null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    this.pool = new Pool({ connectionString: databaseUrl });
    this._db = drizzle(this.pool);
  }

  get db() {
    if (!this._db) {
      throw new Error('Database not initialized');
    }
    return this._db;
  }
}
