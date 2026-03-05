import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ThreadModel, ThreadMessageModel } from '../models/Thread';
import { AgentModel } from '../models/Agent';
import { FileModel } from '../models/File';
import { TokenUsageModel } from '../models/TokenUsage';
import { aiService, ChatResponse } from '../services/aiService';
import { createResourceNotFoundError, isAppError } from '../utils/errors';
import logger from '../utils/logger';

@Injectable()
export class ThreadsService {
  async findByProjectId(projectId: string, userId: string) {
    try {
      return await ThreadModel.findByProjectId(projectId, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) throw new ForbiddenException('Access denied');
      throw error;
    }
  }

  async findById(threadId: string, userId: string) {
    try {
      const thread = await ThreadModel.findById(threadId, userId);
      if (!thread) throw new NotFoundException('Thread not found');
      return thread;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Error && error.message.includes('access denied')) throw new ForbiddenException('Access denied');
      throw error;
    }
  }

  async create(projectId: string, title: string | undefined, userId: string) {
    try {
      return await ThreadModel.create({ project_id: projectId, title }, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) throw new ForbiddenException('Access denied');
      throw error;
    }
  }

  async update(threadId: string, title: string, userId: string) {
    try {
      const thread = await ThreadModel.update(threadId, { title }, userId);
      if (!thread) throw new NotFoundException('Thread not found');
      return thread;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Error && error.message.includes('access denied')) throw new ForbiddenException('Access denied');
      throw error;
    }
  }

  async delete(threadId: string, userId: string) {
    try {
      const deleted = await ThreadModel.delete(threadId, userId);
      if (!deleted) throw new NotFoundException('Thread not found');
      return { message: 'Thread deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Error && error.message.includes('access denied')) throw new ForbiddenException('Access denied');
      throw error;
    }
  }

  async getThreadStats(threadId: string, userId: string) {
    return TokenUsageModel.getThreadStats(threadId, userId);
  }

  async getMessages(threadId: string, userId: string) {
    try {
      return await ThreadMessageModel.findByThreadId(threadId, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) throw new ForbiddenException('Access denied');
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string) {
    try {
      const deleted = await ThreadMessageModel.delete(messageId, userId);
      if (!deleted) throw new NotFoundException('Message not found');
      return { message: 'Message deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Error && error.message.includes('access denied')) throw new ForbiddenException('Access denied');
      throw error;
    }
  }

  async chat(params: { threadId: string; agentId: string; userId: string; message: string; includeFiles: boolean; stream: boolean }) {
    const { threadId, agentId, userId, message, includeFiles, stream } = params;

    const thread = await this.findById(threadId, userId);
    const agent = await AgentModel.findById(agentId);
    if (!agent) throw createResourceNotFoundError('Agent', agentId);

    await ThreadMessageModel.create({ thread_id: threadId, agent_id: null, role: 'user', content: message }, userId);
    await ThreadModel.updateTitleFromFirstMessage(threadId, userId);

    const recentMessages = await ThreadMessageModel.getRecentMessages(threadId, userId, 20);
    const aiMessages = recentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, timestamp: m.created_at }));

    let projectFiles: string[] = [];
    const warnings: string[] = [];
    if (includeFiles) {
      try {
        const files = await FileModel.findByProjectId(thread.project_id, userId);
        projectFiles = files.map(file => `File: ${file.name} (${file.type})\n${file.content}`);
      } catch (error) {
        warnings.push('Failed to load project files for context');
      }
    }

    const aiResponse = await aiService.chat({ agent, messages: aiMessages, projectFiles, userId, projectId: thread.project_id, conversationId: threadId, stream });

    return { aiResponse, thread, agent, agentId, warnings };
  }

  async saveAssistantMessage(threadId: string, agentId: string, content: string, metadata: any, userId: string) {
    return ThreadMessageModel.create({ thread_id: threadId, agent_id: agentId, role: 'assistant', content, metadata }, userId);
  }
}
