import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MessageModel } from '../models/Message';
import { ProjectModel } from '../models/Project';
import { UserModel } from '../models/User';
import { JwtPayload, SocketMessage, TypingStatus } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

export class SocketHandler {
  private io: SocketServer;
  private connectedUsers: Map<string, AuthenticatedSocket[]> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();

  constructor(io: SocketServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
      
      // Verify user still exists
      const user = await UserModel.findById(decoded.user_id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.email = user.email;
      
      logger.info('Socket authenticated', { userId: user.id, socketId: socket.id });
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    
    logger.info('User connected via socket', { userId, socketId: socket.id });

    // Add to connected users
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    this.connectedUsers.get(userId)!.push(socket);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Handle project room joining
    socket.on('join-project', this.handleJoinProject.bind(this, socket));
    socket.on('leave-project', this.handleLeaveProject.bind(this, socket));
    
    // Handle messaging
    socket.on('send-message', this.handleSendMessage.bind(this, socket));
    socket.on('typing-start', this.handleTypingStart.bind(this, socket));
    socket.on('typing-stop', this.handleTypingStop.bind(this, socket));
    
    // Handle disconnection
    socket.on('disconnect', this.handleDisconnection.bind(this, socket));
  }

  private async handleJoinProject(socket: AuthenticatedSocket, data: { projectId: string }): Promise<void> {
    try {
      const { projectId } = data;
      const userId = socket.userId!;

      // Verify user has access to project
      const project = await ProjectModel.findById(projectId, userId);
      if (!project) {
        socket.emit('error', { message: 'Project not found or access denied' });
        return;
      }

      // Join project room
      socket.join(`project:${projectId}`);
      
      logger.info('User joined project room', { userId, projectId, socketId: socket.id });

      // Notify user of successful join
      socket.emit('project-joined', { projectId, project });

      // Load recent messages for context (non-critical - don't fail join if this errors)
      try {
        const recentMessages = await MessageModel.getRecentMessages(projectId, userId, 20);
        socket.emit('message-history', { projectId, messages: recentMessages });
      } catch (messageError) {
        logger.warn('Could not load message history', {
          projectId,
          userId,
          error: messageError instanceof Error ? messageError.message : String(messageError),
          errorStack: messageError instanceof Error ? messageError.stack : undefined
        });
        // Send empty message history - join still succeeds
        socket.emit('message-history', { projectId, messages: [] });
      }

    } catch (error) {
      logger.error('Error joining project:', {
        error,
        projectId: data.projectId,
        userId: socket.userId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      socket.emit('error', {
        message: 'Failed to join project',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  }

  private handleLeaveProject(socket: AuthenticatedSocket, data: { projectId: string }): void {
    const { projectId } = data;
    const userId = socket.userId!;

    socket.leave(`project:${projectId}`);
    
    // Stop typing if user was typing
    this.handleTypingStop(socket, { projectId });
    
    logger.info('User left project room', { userId, projectId, socketId: socket.id });
    
    socket.emit('project-left', { projectId });
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: {
    projectId: string;
    content: string;
    role: 'user' | 'assistant';
    metadata?: any;
  }): Promise<void> {
    try {
      const { projectId, content, role, metadata } = data;
      const userId = socket.userId!;

      // Verify user has access to project
      const project = await ProjectModel.findById(projectId, userId);
      if (!project) {
        socket.emit('error', { message: 'Project not found or access denied' });
        return;
      }

      // Create message
      const message = await MessageModel.create(projectId, {
        content,
        role,
        metadata
      });

      logger.info('Message sent via socket', { 
        messageId: message.id, 
        projectId, 
        userId, 
        role 
      });

      // Broadcast message to all users in the project room
      this.io.to(`project:${projectId}`).emit('new-message', {
        projectId,
        message,
        sender: {
          id: userId,
          email: socket.email
        }
      });

      // Stop typing indicator for this user
      this.handleTypingStop(socket, { projectId });

    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: { projectId: string }): void {
    const { projectId } = data;
    const userId = socket.userId!;

    if (!this.typingUsers.has(projectId)) {
      this.typingUsers.set(projectId, new Set());
    }

    const typingInProject = this.typingUsers.get(projectId)!;
    const wasEmpty = typingInProject.size === 0;

    typingInProject.add(userId);

    // Broadcast typing status to others in the project (exclude sender)
    socket.to(`project:${projectId}`).emit('typing-update', {
      projectId,
      userId,
      isTyping: true,
      typingUsers: Array.from(typingInProject)
    });

    logger.debug('User started typing', { userId, projectId });
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: { projectId: string }): void {
    const { projectId } = data;
    const userId = socket.userId!;

    const typingInProject = this.typingUsers.get(projectId);
    if (!typingInProject) return;

    typingInProject.delete(userId);

    // Clean up empty sets
    if (typingInProject.size === 0) {
      this.typingUsers.delete(projectId);
    }

    // Broadcast typing status to others in the project (exclude sender)
    socket.to(`project:${projectId}`).emit('typing-update', {
      projectId,
      userId,
      isTyping: false,
      typingUsers: Array.from(typingInProject || new Set())
    });

    logger.debug('User stopped typing', { userId, projectId });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;

    // Remove from connected users
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      const index = userSockets.indexOf(socket);
      if (index > -1) {
        userSockets.splice(index, 1);
      }
      
      if (userSockets.length === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Clean up typing indicators
    for (const [projectId, typingUsers] of this.typingUsers.entries()) {
      if (typingUsers.has(userId)) {
        typingUsers.delete(userId);
        
        // Notify others that user stopped typing
        socket.to(`project:${projectId}`).emit('typing-update', {
          projectId,
          userId,
          isTyping: false,
          typingUsers: Array.from(typingUsers)
        });

        // Clean up empty sets
        if (typingUsers.size === 0) {
          this.typingUsers.delete(projectId);
        }
      }
    }

    logger.info('User disconnected', { userId, socketId: socket.id });
  }

  // Public methods for external use
  
  public sendMessageToProject(projectId: string, message: any): void {
    this.io.to(`project:${projectId}`).emit('new-message', message);
  }

  public sendNotificationToUser(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  public broadcastSystemMessage(message: string): void {
    this.io.emit('system-message', { message, timestamp: new Date() });
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getUserSocketCount(userId: string): number {
    return this.connectedUsers.get(userId)?.length || 0;
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getProjectTypingUsers(projectId: string): string[] {
    return Array.from(this.typingUsers.get(projectId) || new Set());
  }
}