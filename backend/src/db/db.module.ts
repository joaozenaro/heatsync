import { Module } from '@nestjs/common';
import { DbClient } from './client';

@Module({
  providers: [DbClient],
  exports: [DbClient],
})
export class DbModule {}
