import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { ConversationModel } from '../models/Conversation';
import { AgentModel } from '../models/Agent';
import { ErrorResponse, MessageResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface Conversation {
  id: string | null;
  project_id: string;
  agent_id: string;
  messages: Message[];
  created_at: Date | null;
  updated_at: Date | null;
}

interface AddMessageRequest {
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
}

interface ConversationStats {
  message_count?: number;
  total_messages?: number;
  user_messages?: number;
  assistant_messages?: number;
  first_message_at?: Date | null;
  last_message_at?: Date | null;
  last_activity?: Date | null;
  total_input_tokens?: number;
  total_output_tokens?: number;
}

// ===== Success Response Types =====

interface GetConversationResponse {
  success: true;
  data: {
    conversation: Conversation;
  };
}

interface AddMessageResponse {
  success: true;
  data: {
    conversation: Conversation;
  };
}

interface ClearConversationResponse extends MessageResponse {}

interface GetProjectConversationsResponse {
  success: true;
  data: {
    conversations: Conversation[];
  };
}

interface GetConversationStatsResponse {
  success: true;
  data: ConversationStats;
}

/**
 * Conversations Management
 *
 * Endpoints for managing AI conversations between projects and agents.
 */
@Route('conversations')
@Tags('Conversations')
export class ConversationsController extends Controller {
  /**
   * Get conversation between project and agent
   *
   * Retrieves the conversation history for a specific project-agent pair.
   *
   * @summary Get conversation
   * @param projectId Project ID
   * @param agentId Agent ID
   */
  @Get('{projectId}/{agentId}')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(404, 'Agent not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch conversation')
  public async getConversation(
    @Path() projectId: string,
    @Path() agentId: string,
    @Request() request: ExpressRequest
  ): Promise<GetConversationResponse> {
    try {
      const userId = request.user!.id;

      // Verify agent exists
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        this.setStatus(404);
        throw new Error('Agent not found');
      }

      const conversation = await ConversationModel.findByProjectAndAgent(
        projectId,
        agentId,
        userId
      );

      return {
        success: true,
        data: {
          conversation: conversation || {
            id: null,
            project_id: projectId,
            agent_id: agentId,
            messages: [],
            created_at: null,
            updated_at: null
          }
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied');
      }

      logger.error('Error fetching conversation:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Add message to conversation
   *
   * Adds a new message to an existing conversation or creates a new conversation.
   *
   * @summary Add message to conversation
   * @param projectId Project ID
   * @param agentId Agent ID
   */
  @Post('{projectId}/{agentId}/messages')
  @Security('jwt')
  @SuccessResponse('201', 'Message added successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(404, 'Agent not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to add message')
  public async addMessage(
    @Path() projectId: string,
    @Path() agentId: string,
    @Body() requestBody: AddMessageRequest,
    @Request() request: ExpressRequest
  ): Promise<AddMessageResponse> {
    try {
      const userId = request.user!.id;
      const { role, content, metadata } = requestBody;

      // Verify agent exists
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        this.setStatus(404);
        throw new Error('Agent not found');
      }

      const message = {
        role,
        content,
        timestamp: new Date(),
        metadata
      };

      const conversation = await ConversationModel.addMessage(
        projectId,
        agentId,
        message,
        userId
      );

      logger.info('Message added to conversation', {
        projectId,
        agentId,
        userId,
        role,
        messageLength: content.length,
        correlationId: request.headers['x-correlation-id'] || 'unknown'
      });

      this.setStatus(201);
      return {
        success: true,
        data: {
          conversation
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied');
      }

      logger.error('Error adding message to conversation:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Clear conversation
   *
   * Clears all messages from a conversation.
   *
   * @summary Clear conversation
   * @param projectId Project ID
   * @param agentId Agent ID
   */
  @Delete('{projectId}/{agentId}')
  @Security('jwt')
  @SuccessResponse('200', 'Conversation cleared successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to clear conversation')
  public async clearConversation(
    @Path() projectId: string,
    @Path() agentId: string,
    @Request() request: ExpressRequest
  ): Promise<ClearConversationResponse> {
    try {
      const userId = request.user!.id;

      const cleared = await ConversationModel.clearConversation(
        projectId,
        agentId,
        userId
      );

      logger.info('Conversation cleared', {
        projectId,
        agentId,
        userId,
        existed: cleared,
        correlationId: request.headers['x-correlation-id'] || 'unknown'
      });

      return {
        success: true,
        message: 'Conversation cleared successfully'
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied');
      }

      logger.error('Error clearing conversation:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get all conversations for a project
   *
   * Retrieves all conversations associated with a specific project.
   *
   * @summary Get project conversations
   * @param projectId Project ID
   */
  @Get('{projectId}')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch conversations')
  public async getProjectConversations(
    @Path() projectId: string,
    @Request() request: ExpressRequest
  ): Promise<GetProjectConversationsResponse> {
    try {
      const userId = request.user!.id;

      const conversations = await ConversationModel.getProjectConversations(
        projectId,
        userId
      );

      return {
        success: true,
        data: {
          conversations
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied');
      }

      logger.error('Error fetching project conversations:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get conversation statistics
   *
   * Retrieves statistics about a specific conversation.
   *
   * @summary Get conversation statistics
   * @param projectId Project ID
   * @param agentId Agent ID
   */
  @Get('{projectId}/{agentId}/stats')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch conversation statistics')
  public async getConversationStats(
    @Path() projectId: string,
    @Path() agentId: string,
    @Request() request: ExpressRequest
  ): Promise<GetConversationStatsResponse> {
    try {
      const userId = request.user!.id;

      const stats = await ConversationModel.getConversationStats(
        projectId,
        agentId,
        userId
      );

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied');
      }

      logger.error('Error fetching conversation stats:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }
}
