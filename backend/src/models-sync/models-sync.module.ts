import { Module } from '@nestjs/common';
import { ModelsSyncController } from './models-sync.controller';
import { ModelsSyncService } from './models-sync.service';

@Module({
  controllers: [ModelsSyncController],
  providers: [ModelsSyncService],
  exports: [ModelsSyncService],
})
export class ModelsSyncModule {}
