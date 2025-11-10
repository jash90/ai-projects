import {
  Body,
  Controller,
  Get,
  Post,
  Path,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { aiService } from '../services/aiService';
import { ErrorResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface ChatRequest {
  message: string;
  includeFiles?: boolean;
  stream?: boolean;
}

interface ChatMetadata {
  model: string;
  provider: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cost?: number;
  finish_reason?: string;
}

interface ChatResponseData {
  content: string;
  metadata?: ChatMetadata;
}

interface ChatConversation {
  id: string;
  project_id: string;
  agent_id: string;
  messages: any[];
  created_at: Date;
  updated_at: Date;
}

interface ChatProviderInfo {
  [provider: string]: boolean;
}

interface ChatModelInfo {
  [provider: string]: string[];
}

interface ValidateAgentRequest {
  provider: 'openai' | 'anthropic';
  model: string;
}

// ===== Success Response Types =====

interface ChatResponse {
  success: true;
  data: {
    conversation: ChatConversation;
    response: ChatResponseData;
  };
}

interface GetAIStatusResponse {
  success: true;
  data: {
    providers: ChatProviderInfo;
    models: ChatModelInfo;
  };
}

interface ValidateAgentResponse {
  success: true;
  data: {
    provider: string;
    model: string;
    valid: boolean;
  };
}

/**
 * AI Chat Management
 *
 * Endpoints for AI chat conversations. Note: Streaming responses are handled by Express routes.
 */
@Route('chat')
@Tags('Chat')
export class ChatController extends Controller {
  /**
   * Send message to AI agent (non-streaming)
   *
   * NOTE: This endpoint only handles non-streaming responses.
   * For streaming responses, use the Express route directly at
   * POST /api/projects/:projectId/agents/:agentId/chat with stream=true
   *
   * @summary Send message to AI agent
   * @param projectId Project ID
   * @param agentId Agent ID
   */
  @Post('projects/{projectId}/agents/{agentId}/chat')
  @Security('jwt')
  @SuccessResponse('200', 'Message sent successfully')
  @TsoaResponse<ErrorResponse>(404, 'Agent or project not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to send message')
  public async sendMessage(
    @Path() projectId: string,
    @Path() agentId: string,
    @Body() requestBody: ChatRequest,
    @Request() request: ExpressRequest
  ): Promise<ChatResponse> {
    // Note: The actual implementation is in routes/chat.ts
    // This controller method is for documentation purposes only
    // tsoa will generate the OpenAPI spec, but Express handles the actual logic
    throw new Error('This endpoint should be handled by Express routes/chat.ts');
  }

  /**
   * Get AI models and provider status
   *
   * Returns information about configured AI providers and available models.
   *
   * @summary Get AI status
   */
  @Get('ai/status')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch AI status')
  public async getAIStatus(
    @Request() request: ExpressRequest
  ): Promise<GetAIStatusResponse> {
    try {
      const providerStatus = aiService.getProviderStatus();
      const availableModels = await aiService.getAvailableModels();

      return {
        success: true,
        data: {
          providers: providerStatus,
          models: availableModels
        }
      };
    } catch (error) {
      logger.error('Error fetching AI status:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to fetch AI status');
    }
  }

  /**
   * Validate agent configuration
   *
   * Validates that a specific AI provider and model combination is available.
   *
   * @summary Validate agent configuration
   */
  @Post('ai/validate')
  @Security('jwt')
  @SuccessResponse('200', 'Configuration is valid')
  @TsoaResponse<ErrorResponse>(400, 'Invalid configuration')
  @TsoaResponse<ErrorResponse>(500, 'Failed to validate configuration')
  public async validateAgent(
    @Body() requestBody: ValidateAgentRequest,
    @Request() request: ExpressRequest
  ): Promise<ValidateAgentResponse> {
    try {
      const { provider, model } = requestBody;

      const providerStatus = aiService.getProviderStatus();
      if (!providerStatus[provider]) {
        this.setStatus(400);
        throw new Error(`${provider} API key not configured`);
      }

      const isModelAvailable = aiService.isModelAvailable(provider, model);
      if (!isModelAvailable) {
        this.setStatus(400);
        throw new Error(`Model ${model} not available for provider ${provider}`);
      }

      return {
        success: true,
        data: {
          provider,
          model,
          valid: true
        }
      };
    } catch (error) {
      logger.error('Error validating AI configuration:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }
}
