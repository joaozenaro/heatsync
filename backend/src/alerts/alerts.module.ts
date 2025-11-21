import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { DbModule } from '../db/db.module';
import { SupabaseModule } from 'src/auth/supabase.module';

@Module({
  imports: [DbModule, SupabaseModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
