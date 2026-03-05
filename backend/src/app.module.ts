import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { appConfig, databaseConfig, authConfig, aiConfig, analyticsConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { AgentsModule } from './agents/agents.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { FilesModule } from './files/files.module';
import { ChatModule } from './chat/chat.module';
import { ThreadsModule } from './threads/threads.module';
import { ModelsSyncModule } from './models-sync/models-sync.module';
import { UsageModule } from './usage/usage.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { MarkdownModule } from './markdown/markdown.module';
import { AppWebSocketModule } from './websocket/websocket.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DebugModule } from './debug/debug.module';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, aiConfig, analyticsConfig],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 900000, // 15 minutes
        limit: process.env.NODE_ENV === 'development' ? 5000 : 2000,
      },
    ]),
    DatabaseModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ProjectsModule,
    AgentsModule,
    ConversationsModule,
    MessagesModule,
    FilesModule,
    ChatModule,
    ThreadsModule,
    ModelsSyncModule,
    UsageModule,
    SettingsModule,
    AdminModule,
    MarkdownModule,
    AppWebSocketModule,
    AnalyticsModule,
    DebugModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SanitizeMiddleware).forRoutes('*');
  }
}
