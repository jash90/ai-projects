import { Global, Module } from '@nestjs/common';
import { pool, redis } from './connection';

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useValue: pool,
    },
    {
      provide: 'REDIS_CLIENT',
      useValue: redis,
    },
  ],
  exports: ['PG_POOL', 'REDIS_CLIENT'],
})
export class DatabaseModule {}
