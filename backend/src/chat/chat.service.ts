import { Injectable } from '@nestjs/common';
import { AgentModel } from '../models/Agent';
import { ConversationModel } from '../models/Conversation';
import { FileModel } from '../models/File';
import { aiService, ChatResponse } from '../services/aiService';
import { createResourceNotFoundError } from '../utils/errors';
import { ChatFileAttachment } from '../types';
import logger from '../utils/logger';

@Injectable()
export class ChatService {
  async chat(params: {
    projectId: string;
    agentId: string;
    userId: string;
    message: string;
    includeFiles: boolean;
    stream: boolean;
    attachments?: ChatFileAttachment[];
  }) {
    const { projectId, agentId, userId, message, includeFiles, stream, attachments } = params;

    const agent = await AgentModel.findById(agentId);
    if (!agent) throw createResourceNotFoundError('Agent', agentId);

    const conversation = await ConversationModel.findByProjectAndAgent(projectId, agentId, userId);
    const messages = conversation ? conversation.messages : [];

    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
      metadata: attachments && attachments.length > 0 ? {
        attachments: attachments.map(a => ({ filename: a.filename, mimetype: a.mimetype, size: a.size }))
      } : undefined,
    };
    messages.push(userMessage);

    let projectFiles: string[] = [];
    if (includeFiles) {
      try {
        const files = await FileModel.findByProjectId(projectId, userId);
        projectFiles = files.map(file => `File: ${file.name} (${file.type})\n${file.content}`);
      } catch (error) {
        logger.warn('Failed to load project files for context', { projectId, userId });
      }
    }

    return {
      aiResponse: await aiService.chat({
        agent,
        messages,
        projectFiles,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        userId,
        projectId,
        conversationId: conversation?.id,
        stream,
      }),
      messages,
      projectId,
      agentId,
      userId,
    };
  }

  async saveConversation(projectId: string, agentId: string, messages: any[], userId: string) {
    return ConversationModel.createOrUpdate(projectId, agentId, messages, userId);
  }

  getProviderStatus() {
    return aiService.getProviderStatus();
  }

  getAvailableModels() {
    return aiService.getAvailableModels();
  }

  isModelAvailable(provider: string, model: string) {
    return aiService.isModelAvailable(provider as 'openai' | 'anthropic' | 'openrouter', model);
  }
}
