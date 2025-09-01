import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Agent, ConversationMessage, MessageMetadata } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';
import { TokenService } from './tokenService';

export interface ChatRequest {
  agent: Agent;
  messages: ConversationMessage[];
  projectFiles?: string[];
  userId?: string;
  projectId?: string;
  conversationId?: string;
}

export interface ChatResponse {
  content: string;
  metadata: MessageMetadata;
}

class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    if (config.ai.openai_api_key) {
      this.openai = new OpenAI({
        apiKey: config.ai.openai_api_key,
      });
    }

    if (config.ai.anthropic_api_key) {
      try {
        this.anthropic = new Anthropic({
          apiKey: config.ai.anthropic_api_key,
        });
        logger.info('Anthropic client initialized successfully');
        logger.info(`Anthropic client type: ${typeof this.anthropic}`);
        logger.info(`Anthropic messages available: ${!!this.anthropic?.messages}`);
      } catch (error) {
        logger.error('Failed to initialize Anthropic client:', error);
        this.anthropic = null;
      }
    } else {
      logger.warn('Anthropic API key not configured');
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { agent, messages, projectFiles, userId, projectId, conversationId } = request;
    const startTime = Date.now();

    try {
      let response: ChatResponse;

      if (agent.provider === 'openai') {
        response = await this.chatWithOpenAI(agent, messages, projectFiles, userId, projectId, conversationId);
      } else if (agent.provider === 'anthropic') {
        response = await this.chatWithAnthropic(agent, messages, projectFiles, userId, projectId, conversationId);
      } else {
        throw new Error(`Unsupported AI provider: ${agent.provider}`);
      }

      const processingTime = Date.now() - startTime;
      response.metadata.processing_time = processingTime;

      logger.info('AI chat completed', {
        provider: agent.provider,
        model: agent.model,
        processing_time: processingTime,
        input_messages: messages.length,
        output_length: response.content.length,
        tokens: response.metadata.tokens
      });

      return response;
    } catch (error) {
      logger.error('AI chat failed', {
        provider: agent.provider,
        model: agent.model,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: Date.now() - startTime
      });
      throw error;
    }
  }

  private async chatWithOpenAI(
    agent: Agent,
    messages: ConversationMessage[],
    projectFiles?: string[],
    userId?: string,
    projectId?: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Build system message with agent prompt and file context
    let systemContent = agent.system_prompt;
    if (projectFiles && projectFiles.length > 0) {
      systemContent += '\n\nProject Files:\n' + projectFiles.join('\n\n');
    }

    // Convert messages to OpenAI format
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    // Some newer models only support default temperature (1.0)
    const modelsRequiringDefaultTemp = ['gpt-5', 'gpt-5-high', 'o1', 'o3'];
    const useDefaultTemp = modelsRequiringDefaultTemp.includes(agent.model);
    
    const requestParams: any = {
      model: agent.model,
      messages: openaiMessages,
      max_completion_tokens: agent.max_tokens,
    };
    
    // Only include temperature if the model supports it
    if (!useDefaultTemp) {
      requestParams.temperature = agent.temperature;
    }
    
    const completion = await this.openai.chat.completions.create(requestParams);

    const choice = completion.choices[0];
    if (!choice.message.content) {
      throw new Error('No response content from OpenAI');
    }

    // Track token usage if user context is provided
    if (userId && completion.usage) {
      await TokenService.trackUsage({
        userId,
        projectId,
        agentId: agent.id,
        conversationId,
        provider: 'openai',
        model: agent.model,
        promptTokens: completion.usage.prompt_tokens || 0,
        completionTokens: completion.usage.completion_tokens || 0,
        requestType: 'chat'
      });
    }

    return {
      content: choice.message.content,
      metadata: {
        model: agent.model,
        tokens: completion.usage?.total_tokens,
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        files: projectFiles
      }
    };
  }

  private async chatWithAnthropic(
    agent: Agent,
    messages: ConversationMessage[],
    projectFiles?: string[],
    userId?: string,
    projectId?: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    logger.info(`Anthropic client check: ${!!this.anthropic}`);
    logger.info(`Anthropic messages check: ${!!this.anthropic?.messages}`);
    
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }
    
    const actualModel = agent.model;

    // Build system message with agent prompt and file context
    let systemContent = agent.system_prompt;
    if (projectFiles && projectFiles.length > 0) {
      systemContent += '\n\nProject Files:\n' + projectFiles.join('\n\n');
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const completion = await this.anthropic.messages.create({
        model: actualModel, // Use the mapped model name
        max_tokens: agent.max_tokens,
        temperature: agent.temperature,
        system: systemContent,
        messages: anthropicMessages,
      });

      const content = completion.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }

      // Track token usage if user context is provided
      if (userId && completion.usage) {
        await TokenService.trackUsage({
          userId,
          projectId,
          agentId: agent.id,
          conversationId,
          provider: 'anthropic',
          model: agent.model,
          promptTokens: completion.usage.input_tokens || 0,
          completionTokens: completion.usage.output_tokens || 0,
          requestType: 'chat'
        });
      }

      return {
        content: content.text,
        metadata: {
          model: agent.model,
          tokens: completion.usage ? completion.usage.input_tokens + completion.usage.output_tokens : 0,
          prompt_tokens: completion.usage?.input_tokens,
          completion_tokens: completion.usage?.output_tokens,
          files: projectFiles
        }
      };
    } catch (error: any) {
      logger.error('Anthropic API error details:', error);
      
      // Handle different error types
      if (error?.response?.data?.error?.message) {
        throw new Error(`Anthropic API error: ${error.response.data.error.message}`);
      } else if (error?.message) {
        throw new Error(`Anthropic API error: ${error.message}`);
      } else if (typeof error === 'string') {
        throw new Error(`Anthropic API error: ${error}`);
      } else {
        throw new Error('Unknown error occurred with Anthropic API');
      }
    }
  }

  // Get available models for each provider (async now)
  async getAvailableModels(): Promise<Record<string, string[]>> {
    const { modelService } = await import('./modelService');
    const models = await modelService.getAvailableModels();
    
    const result: Record<string, string[]> = {};
    for (const model of models) {
      if (!result[model.provider]) {
        result[model.provider] = [];
      }
      result[model.provider].push(model.id);
    }
    
    return result;
  }

  // Validate if a model is available for a provider (async now)
  async isModelAvailable(provider: 'openai' | 'anthropic', model: string): Promise<boolean> {
    const { modelService } = await import('./modelService');
    const modelData = await modelService.getModelById(model);
    return modelData?.provider === provider && !!modelData;
  }

  // Get provider status
  getProviderStatus(): Record<string, boolean> {
    return {
      openai: !!this.openai,
      anthropic: !!this.anthropic
    };
  }
}

export const aiService = new AIService();
