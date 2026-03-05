import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationModel } from '../models/Conversation';

@Injectable()
export class ConversationsService {
  async findByProjectAndAgent(projectId: string, agentId: string, userId: string) {
    return ConversationModel.findByProjectAndAgent(projectId, agentId, userId);
  }

  async getProjectConversations(projectId: string, userId: string) {
    return ConversationModel.getProjectConversations(projectId, userId);
  }

  async createOrUpdate(projectId: string, agentId: string, messages: any[], userId: string) {
    return ConversationModel.createOrUpdate(projectId, agentId, messages, userId);
  }

  async addMessage(projectId: string, agentId: string, message: any, userId: string) {
    return ConversationModel.addMessage(projectId, agentId, message, userId);
  }

  async clear(projectId: string, agentId: string, userId: string) {
    return ConversationModel.clearConversation(projectId, agentId, userId);
  }
}
