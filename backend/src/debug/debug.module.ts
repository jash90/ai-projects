import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';

@Module({
  controllers: process.env.NODE_ENV === 'production' ? [] : [DebugController],
})
export class DebugModule {}
