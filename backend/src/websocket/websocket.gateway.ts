import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../utils/config';
import logger from '../utils/logger';

@WebSocketGateway({
  cors: {
    origin: (config.cors_origin || 'http://localhost:3000').split(',').map((o: string) => o.trim()),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    logger.debug('Socket.IO client connected', { socketId: client.id });
  }

  handleDisconnect(client: Socket) {
    // Remove from all rooms
    for (const [projectId, users] of this.connectedUsers) {
      users.delete(client.id);
      if (users.size === 0) this.connectedUsers.delete(projectId);
    }
    logger.debug('Socket.IO client disconnected', { socketId: client.id });
  }

  @SubscribeMessage('join-project')
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    if (!data.projectId) return;
    client.join(`project:${data.projectId}`);
    if (!this.connectedUsers.has(data.projectId)) {
      this.connectedUsers.set(data.projectId, new Set());
    }
    this.connectedUsers.get(data.projectId)!.add(client.id);
    logger.debug('Client joined project', { socketId: client.id, projectId: data.projectId });
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    if (!data.projectId) return;
    client.leave(`project:${data.projectId}`);
    this.connectedUsers.get(data.projectId)?.delete(client.id);
  }

  @SubscribeMessage('typing-start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; userId: string },
  ) {
    client.to(`project:${data.projectId}`).emit('typing-start', { userId: data.userId });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; userId: string },
  ) {
    client.to(`project:${data.projectId}`).emit('typing-stop', { userId: data.userId });
  }

  emitToProject(projectId: string, event: string, data: any) {
    this.server.to(`project:${projectId}`).emit(event, data);
  }

  getConnectedUsersCount(): number {
    let total = 0;
    for (const users of this.connectedUsers.values()) total += users.size;
    return total;
  }
}
