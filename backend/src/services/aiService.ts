import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Agent, ConversationMessage, MessageMetadata } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';

export interface ChatRequest {
  agent: Agent;
  messages: ConversationMessage[];
  projectFiles?: string[];
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
      this.anthropic = new Anthropic({
        apiKey: config.ai.anthropic_api_key,
      });
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { agent, messages, projectFiles } = request;
    const startTime = Date.now();

    try {
      let response: ChatResponse;

      if (agent.provider === 'openai') {
        response = await this.chatWithOpenAI(agent, messages, projectFiles);
      } else if (agent.provider === 'anthropic') {
        response = await this.chatWithAnthropic(agent, messages, projectFiles);
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
    projectFiles?: string[]
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

    const completion = await this.openai.chat.completions.create({
      model: agent.model,
      messages: openaiMessages,
      temperature: agent.temperature,
      max_tokens: agent.max_tokens,
    });

    const choice = completion.choices[0];
    if (!choice.message.content) {
      throw new Error('No response content from OpenAI');
    }

    return {
      content: choice.message.content,
      metadata: {
        model: agent.model,
        tokens: completion.usage?.total_tokens,
        files: projectFiles
      }
    };
  }

  private async chatWithAnthropic(
    agent: Agent,
    messages: ConversationMessage[],
    projectFiles?: string[]
  ): Promise<ChatResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

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

    const completion = await this.anthropic.messages.create({
      model: agent.model,
      max_tokens: agent.max_tokens,
      temperature: agent.temperature,
      system: systemContent,
      messages: anthropicMessages,
    });

    const content = completion.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return {
      content: content.text,
      metadata: {
        model: agent.model,
        tokens: completion.usage.input_tokens + completion.usage.output_tokens,
        files: projectFiles
      }
    };
  }

  // Get available models for each provider
  getAvailableModels(): Record<string, string[]> {
    return {
      openai: [
        'gpt-4-1106-preview',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k'
      ],
      anthropic: [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ]
    };
  }

  // Validate if a model is available for a provider
  isModelAvailable(provider: 'openai' | 'anthropic', model: string): boolean {
    const availableModels = this.getAvailableModels();
    return availableModels[provider]?.includes(model) || false;
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
