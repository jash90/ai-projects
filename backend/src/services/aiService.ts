import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Agent, ConversationMessage, MessageMetadata, ChatFileAttachment } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';
import { TokenService } from './tokenService';
import { recordAiRequest } from '../analytics/metrics';
import { events as posthogEvents } from '../analytics/posthog';
import { captureException, addBreadcrumb, Sentry } from '../analytics';
import { UserModel } from '../models/User';
import {
  AppError,
  ErrorCode,
  isAppError,
  createAIServiceError,
  createAIModelUnavailableError,
  createAIContentFilteredError,
  createAIApiKeyInvalidError,
  createRateLimitError
} from '../utils/errors';

export interface ChatRequest {
  agent: Agent;
  messages: ConversationMessage[];
  projectFiles?: string[];
  attachments?: ChatFileAttachment[];
  userId?: string;
  projectId?: string;
  conversationId?: string;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  metadata: MessageMetadata;
}

export interface StreamingChatResponse {
  stream: AsyncGenerator<string | ChatResponse, void, unknown>;
}

// Anthropic-supported image MIME types
type AnthropicMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Normalize image MIME type for Anthropic API compatibility.
 * Handles 'image/jpg' which browsers may report but Anthropic doesn't accept.
 */
function normalizeImageMimeType(mimetype: string): AnthropicMediaType | null {
  // Normalize image/jpg to image/jpeg
  const normalized = mimetype === 'image/jpg' ? 'image/jpeg' : mimetype;
  const validTypes: AnthropicMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(normalized as AnthropicMediaType)
    ? (normalized as AnthropicMediaType)
    : null;
}

class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private openrouter: OpenAI | null = null;

  constructor() {
    if (config.ai.openai_api_key) {
      this.openai = new OpenAI({
        apiKey: config.ai.openai_api_key,
        timeout: 120000, // 2 minutes timeout for AI processing
        maxRetries: 3, // Retry failed requests
      });
    }

    if (config.ai.anthropic_api_key) {
      try {
        this.anthropic = new Anthropic({
          apiKey: config.ai.anthropic_api_key,
          timeout: 120000, // 2 minutes timeout for AI processing
          maxRetries: 3, // Retry failed requests
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

    if (config.ai.openrouter_api_key) {
      this.openrouter = new OpenAI({
        apiKey: config.ai.openrouter_api_key,
        baseURL: 'https://openrouter.ai/api/v1',
        timeout: 120000, // 2 minutes timeout for AI processing
        maxRetries: 3, // Retry failed requests
        defaultHeaders: {
          'HTTP-Referer': process.env.APP_URL || 'https://ai-projects-platform.app', // For OpenRouter rankings
          'X-Title': 'AI Projects Platform', // For OpenRouter rankings
        },
      });
      logger.info('OpenRouter client initialized successfully');
    } else {
      logger.warn('OpenRouter API key not configured');
    }
  }

  /**
   * Check if a model supports custom temperature settings
   * Some models (like o1, o3) only work with default temperature
   */
  private modelSupportsTemperature(model: string): boolean {
    // Models that don't support custom temperature
    const noTempModels = ['o1', 'o3', 'o1-preview', 'o1-mini'];
    return !noTempModels.some(m => model.includes(m));
  }

  /**
   * Build system content from agent prompt, project files, and language instruction.
   */
  private buildSystemContent(agent: Agent, projectFiles?: string[]): string {
    let systemContent = agent.system_prompt;
    if (projectFiles && projectFiles.length > 0) {
      systemContent += '\n\nProject Files:\n' + projectFiles.join('\n\n');
    }
    systemContent += '\n\nIMPORTANT: Always respond in the same language the user writes their message in. Match the user\'s language exactly.';
    return systemContent;
  }

  // Unified safety margin constant used by both truncation and output allocation.
  // 7% of context window is sufficient to account for token estimation inaccuracies.
  private static readonly CONTEXT_SAFETY_MARGIN_RATIO = 0.07;

  /**
   * Calculate the optimal max_tokens for a completion request based on:
   * - The model's context window
   * - The estimated prompt token count (system prompt + messages + project files)
   * - The agent's configured max_tokens as a baseline preference
   * - A safety margin to prevent context overflow
   *
   * The agent's max_tokens is treated as a minimum baseline, not a hard ceiling.
   * The system dynamically allocates more output tokens when the context window
   * has plenty of room, ensuring responses are never cut short artificially.
   *
   * Returns the number of tokens available for the model's completion.
   */
  private calculateOptimalMaxTokens(
    contextWindow: number,
    promptTokenEstimate: number,
    agentMaxTokens: number,
    modelMaxOutputTokens: number
  ): number {
    const safetyMargin = Math.max(100, Math.floor(contextWindow * AIService.CONTEXT_SAFETY_MARGIN_RATIO));
    const availableForOutput = Math.max(contextWindow - promptTokenEstimate - safetyMargin, 256);

    // The hard ceiling is the lesser of what the model supports and what fits in context
    const hardCeiling = Math.min(availableForOutput, modelMaxOutputTokens);

    // The agent's max_tokens is a baseline preference, not a hard cap.
    // Allow up to 40% of context window or 2x the user's setting, whichever is greater.
    // But never exceed the model's actual output limit or available context.
    const dynamicAllowance = Math.max(
      agentMaxTokens * 2,
      Math.floor(contextWindow * 0.4)
    );
    const effectiveMax = Math.min(dynamicAllowance, hardCeiling);

    // Ensure we always honor at least the agent's configured minimum
    const finalMax = Math.max(effectiveMax, Math.min(agentMaxTokens, hardCeiling));

    if (finalMax !== agentMaxTokens) {
      logger.debug('Dynamic max_tokens adjustment', {
        contextWindow,
        promptTokenEstimate,
        safetyMargin,
        availableForOutput,
        modelMaxOutputTokens,
        agentMaxTokens,
        hardCeiling,
        dynamicAllowance,
        effectiveMax: finalMax,
      });
    }

    return finalMax;
  }

  /**
   * Truncate conversation messages to fit within the model's context window.
   * Removes oldest messages first in user/assistant pairs to maintain conversation coherence,
   * always keeping the system prompt and the latest user message.
   *
   * @returns The truncated messages array and the estimated prompt token count
   */
  private truncateMessagesToFitContext(
    messages: ConversationMessage[],
    systemPrompt: string,
    projectFiles: string[] | undefined,
    contextWindow: number,
    modelMaxOutputTokens: number
  ): { messages: ConversationMessage[]; promptTokenEstimate: number } {
    // Estimate tokens for system prompt + project files (fixed overhead)
    let fixedTokens = TokenService.estimateTokens(systemPrompt);
    if (projectFiles) {
      for (const file of projectFiles) {
        fixedTokens += TokenService.estimateTokens(file);
      }
    }
    fixedTokens += 50; // formatting overhead

    // Reserve tokens for output using the unified safety margin
    const outputReserve = Math.min(modelMaxOutputTokens, Math.floor(contextWindow * 0.4));
    const safetyMargin = Math.max(100, Math.floor(contextWindow * AIService.CONTEXT_SAFETY_MARGIN_RATIO));
    const budgetForMessages = contextWindow - fixedTokens - outputReserve - safetyMargin;

    // Edge case: system prompt + project files alone exceed available budget
    if (budgetForMessages <= 0) {
      logger.warn('Fixed tokens exceed available context budget, dropping all prior messages', {
        contextWindow,
        fixedTokens,
        outputReserve,
        safetyMargin,
        budgetForMessages,
        messageCount: messages.length,
      });
      // Keep only the last message (current user message)
      const lastMessage = messages[messages.length - 1];
      const keptMessages = lastMessage ? [lastMessage] : [];
      const lastMsgTokens = lastMessage ? TokenService.estimateTokens(lastMessage.content) + 4 : 0;
      return {
        messages: keptMessages,
        promptTokenEstimate: fixedTokens + lastMsgTokens,
      };
    }

    // Estimate tokens for each message
    const messageEstimates = messages.map(msg => ({
      message: msg,
      tokens: TokenService.estimateTokens(msg.content) + 4, // +4 for role markers
    }));

    // Calculate total message tokens
    const totalMessageTokens = messageEstimates.reduce((sum, m) => sum + m.tokens, 0);

    if (totalMessageTokens <= budgetForMessages) {
      // All messages fit, no truncation needed
      return {
        messages,
        promptTokenEstimate: fixedTokens + totalMessageTokens,
      };
    }

    // Need to truncate: remove oldest messages in user/assistant pairs to maintain
    // conversation coherence. Always keep the last message (current user input).
    const lastMsg = messageEstimates[messageEstimates.length - 1];
    let remainingBudget = budgetForMessages - (lastMsg?.tokens || 0);
    const truncatedMessages: ConversationMessage[] = [];

    // Collect messages from newest to oldest
    for (let i = messageEstimates.length - 2; i >= 0; i--) {
      const current = messageEstimates[i];
      const prev = i > 0 ? messageEstimates[i - 1] : null;

      // Check if this is an assistant message preceded by a user message (a pair)
      const isAssistant = current.message.role === 'assistant';
      const isPartOfPair = isAssistant && prev && prev.message.role === 'user';

      if (isPartOfPair) {
        // Try to add both messages of the pair
        const pairTokens = current.tokens + prev.tokens;
        if (remainingBudget >= pairTokens) {
          remainingBudget -= pairTokens;
          truncatedMessages.unshift(current.message);
          truncatedMessages.unshift(prev.message);
          i--; // Skip the paired user message in next iteration
        }
        // If pair doesn't fit, skip both to maintain coherence
      } else {
        // Non-paired message (e.g., standalone user message) — add individually
        if (remainingBudget >= current.tokens) {
          remainingBudget -= current.tokens;
          truncatedMessages.unshift(current.message);
        }
      }
    }

    // Always include the last message
    if (lastMsg) {
      truncatedMessages.push(lastMsg.message);
    }

    const finalTokenEstimate = fixedTokens + (budgetForMessages - remainingBudget);

    logger.warn('Truncated conversation messages to fit context window', {
      originalCount: messages.length,
      truncatedCount: truncatedMessages.length,
      removedCount: messages.length - truncatedMessages.length,
      contextWindow,
      estimatedTokens: finalTokenEstimate,
    });

    return {
      messages: truncatedMessages,
      promptTokenEstimate: finalTokenEstimate,
    };
  }

  /**
   * Validate OpenRouter model format (must be provider/model-name)
   */
  private validateOpenRouterModel(model: string): void {
    if (!model.includes('/')) {
      throw new AppError({
        code: ErrorCode.AI_MODEL_UNAVAILABLE,
        message: `Invalid OpenRouter model format: "${model}". Expected format: "provider/model-name"`,
        userMessage: `Invalid model format: "${model}". OpenRouter models must use "provider/model-name" format (e.g., "anthropic/claude-3-sonnet").`,
        statusCode: 400
      });
    }
  }

  /**
   * Classify a provider SDK error into the appropriate AppError type.
   */
  private classifyProviderError(
    error: any,
    provider: string,
    model: string
  ): AppError {
    const msg = (error?.message || error?.error?.message || '').toLowerCase();
    const status = error?.status || error?.statusCode || error?.response?.status;

    // Model not found / doesn't exist
    if (
      (msg.includes('model') && (msg.includes('not found') || msg.includes('does not exist') || msg.includes('not exist'))) ||
      msg.includes('unknown model') ||
      msg.includes('model_not_found') ||
      msg.includes('invalid model') ||
      status === 404
    ) {
      return createAIModelUnavailableError(provider, model, error?.message || 'Model not found');
    }

    // Invalid API key / auth
    if (
      msg.includes('invalid api key') || msg.includes('invalid x-api-key') ||
      msg.includes('authentication') || msg.includes('unauthorized') ||
      msg.includes('permission') ||
      status === 401 || status === 403
    ) {
      return createAIApiKeyInvalidError(provider);
    }

    // Content filtered
    if (
      msg.includes('content policy') || msg.includes('content_filter') ||
      msg.includes('content filtered') || msg.includes('safety') ||
      msg.includes('blocked')
    ) {
      return createAIContentFilteredError(provider);
    }

    // Rate limit from provider
    if (msg.includes('rate limit') || status === 429) {
      return createRateLimitError(new Date(Date.now() + 60000));
    }

    // Overloaded / unavailable
    if (
      msg.includes('overloaded') || msg.includes('capacity') ||
      msg.includes('unavailable') || msg.includes('timeout') ||
      status === 503 || status === 529
    ) {
      return createAIServiceError(provider, error?.message || 'Service unavailable');
    }

    // Fallback — generic AI service error
    return createAIServiceError(provider, error?.message || 'Unknown error');
  }

  async chat(request: ChatRequest): Promise<ChatResponse | StreamingChatResponse> {
    const { agent, messages, projectFiles, attachments, userId, projectId, conversationId, stream = false } = request;
    const startTime = Date.now();
    addBreadcrumb({ category: 'ai', message: `AI request: ${agent.provider}/${agent.model}`, level: 'info', data: { provider: agent.provider, model: agent.model } });

    try {
      try {
        addBreadcrumb({ category: 'ai', message: 'AI request started', level: 'info', data: { provider: agent.provider, model: agent.model } });
      } catch {}

      // Validate the model exists and is active
      const { modelService } = await import('./modelService');
      const modelRecord = await modelService.getModelById(agent.model);
      if (!modelRecord) {
        throw createAIModelUnavailableError(
          agent.provider,
          agent.model,
          'Model not found or no longer available. Please select a different model.'
        );
      }

      // Build system content once — reused for token estimation and passed to providers
      const systemContent = this.buildSystemContent(agent, projectFiles);

      // Truncate messages to fit within the model's context window
      const { messages: truncatedMessages, promptTokenEstimate } = this.truncateMessagesToFitContext(
        messages,
        systemContent,
        projectFiles,
        modelRecord.context_window,
        modelRecord.max_tokens
      );

      // Calculate optimal max_tokens based on remaining context window capacity
      const optimalMaxTokens = this.calculateOptimalMaxTokens(
        modelRecord.context_window,
        promptTokenEstimate,
        agent.max_tokens,
        modelRecord.max_tokens
      );

      // Check token limits before processing — use promptTokenEstimate only (output not yet consumed)
      if (userId) {
        await UserModel.checkTokenLimit(userId, promptTokenEstimate);
      }

      // Create an enriched agent with the calculated optimal max_tokens
      const enrichedAgent = { ...agent, max_tokens: optimalMaxTokens };

      if (stream) {
        // Return streaming response
        if (agent.provider === 'openai') {
          return await this.streamChatWithOpenAI(enrichedAgent, truncatedMessages, systemContent, attachments, userId, projectId, conversationId, projectFiles);
        } else if (agent.provider === 'anthropic') {
          return await this.streamChatWithAnthropic(enrichedAgent, truncatedMessages, systemContent, attachments, userId, projectId, conversationId, projectFiles);
        } else if (agent.provider === 'openrouter') {
          return await this.streamChatWithOpenRouter(enrichedAgent, truncatedMessages, systemContent, attachments, userId, projectId, conversationId, projectFiles);
        } else {
          throw new AppError({
            code: ErrorCode.AI_SERVICE_UNAVAILABLE,
            message: `Unsupported AI provider: ${agent.provider}`,
            userMessage: `Provider "${agent.provider}" is not supported.`,
            statusCode: 400
          });
        }
      } else {
        // Return regular response
        let response: ChatResponse;

        if (agent.provider === 'openai') {
          response = await this.chatWithOpenAI(enrichedAgent, truncatedMessages, systemContent, attachments, userId, projectId, conversationId, projectFiles);
        } else if (agent.provider === 'anthropic') {
          response = await this.chatWithAnthropic(enrichedAgent, truncatedMessages, systemContent, attachments, userId, projectId, conversationId, projectFiles);
        } else if (agent.provider === 'openrouter') {
          response = await this.chatWithOpenRouter(enrichedAgent, truncatedMessages, systemContent, attachments, userId, projectId, conversationId, projectFiles);
        } else {
          throw new AppError({
            code: ErrorCode.AI_SERVICE_UNAVAILABLE,
            message: `Unsupported AI provider: ${agent.provider}`,
            userMessage: `Provider "${agent.provider}" is not supported.`,
            statusCode: 400
          });
        }

        const processingTime = Date.now() - startTime;
        response.metadata.processing_time = processingTime;

        logger.info('AI chat completed', {
          provider: agent.provider,
          model: agent.model,
          processing_time: processingTime,
          input_messages: truncatedMessages.length,
          output_length: response.content.length,
          tokens: response.metadata.tokens,
          optimal_max_tokens: optimalMaxTokens,
          prompt_token_estimate: promptTokenEstimate,
          attachments: attachments?.length || 0
        });

        try {
          recordAiRequest(agent.provider, agent.model, 'success', processingTime / 1000, response.metadata.prompt_tokens, response.metadata.completion_tokens);
        } catch (e) { logger.debug('Analytics tracking failed', { error: e }); }

        if (userId) {
          try {
            posthogEvents.chatMessageSent(userId, {
              provider: agent.provider,
              model: agent.model,
              tokensUsed: response.metadata.tokens || 0,
              promptTokens: response.metadata.prompt_tokens || 0,
              completionTokens: response.metadata.completion_tokens || 0,
              responseTimeMs: processingTime,
            });
          } catch (e) { logger.debug('PostHog chat tracking failed', { error: e }); }
        }

        return response;
      }
    } catch (error) {
      logger.error('AI chat failed', {
        provider: agent.provider,
        model: agent.model,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: Date.now() - startTime
      });

      try {
        recordAiRequest(agent.provider, agent.model, 'error', (Date.now() - startTime) / 1000);
        if (userId) posthogEvents.aiError(userId, { provider: agent.provider, model: agent.model, error: error instanceof Error ? error.message : 'Unknown error' });
        captureException(error, { userId, provider: agent.provider, model: agent.model, projectId });
      } catch (e) { logger.debug('Analytics tracking failed', { error: e }); }

      throw error;
    }
  }

  private async chatWithOpenAI(
    agent: Agent,
    messages: ConversationMessage[],
    systemContent: string,
    attachments?: ChatFileAttachment[],
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): Promise<ChatResponse> {
    if (!this.openai) {
      throw createAIApiKeyInvalidError('openai');
    }

    // Convert messages to OpenAI format with multimodal support
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...messages.slice(0, -1).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    // Handle the last message with potential attachments
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (attachments && attachments.length > 0 && lastMessage.role === 'user') {
        // Build multimodal content for the last user message
        const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
          { type: 'text', text: lastMessage.content }
        ];

        for (const attachment of attachments) {
          if (attachment.mimetype.startsWith('image/')) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimetype};base64,${attachment.data}`,
                detail: 'auto'
              }
            });
          }
          // Note: PDFs would need to be handled differently (e.g., convert to text or use document API)
        }

        openaiMessages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        openaiMessages.push({
          role: lastMessage.role as 'user' | 'assistant',
          content: lastMessage.content
        });
      }
    }

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
    
    try {
      return await Sentry.startSpan(
        { name: `ai.chat openai/${agent.model}`, op: 'ai.chat', attributes: { 'ai.provider': 'openai', 'ai.model': agent.model } },
        async () => {
          const completion = await this.openai!.chat.completions.create(requestParams);

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

          const pTokens = completion.usage?.prompt_tokens || 0;
          const cTokens = completion.usage?.completion_tokens || 0;
          const estimatedCost = TokenService.calculateCost('openai', agent.model, pTokens, cTokens);

          return {
            content: choice.message.content,
            metadata: {
              model: agent.model,
              tokens: completion.usage?.total_tokens,
              prompt_tokens: pTokens,
              completion_tokens: cTokens,
              estimated_cost: estimatedCost,
              files: projectFiles
            }
          };
        }
      );
    } catch (error: any) {
      logger.error('OpenAI API error details:', {
        error: error?.message, model: agent.model, status: error?.status
      });
      if (isAppError(error)) throw error;
      throw this.classifyProviderError(error, 'openai', agent.model);
    }
  }

  private async streamChatWithOpenAI(
    agent: Agent,
    messages: ConversationMessage[],
    systemContent: string,
    attachments?: ChatFileAttachment[],
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): Promise<StreamingChatResponse> {
    if (!this.openai) {
      throw createAIApiKeyInvalidError('openai');
    }

    // Convert messages to OpenAI format with multimodal support
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...messages.slice(0, -1).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    // Handle the last message with potential attachments
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (attachments && attachments.length > 0 && lastMessage.role === 'user') {
        // Build multimodal content for the last user message
        const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
          { type: 'text', text: lastMessage.content }
        ];

        for (const attachment of attachments) {
          if (attachment.mimetype.startsWith('image/')) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimetype};base64,${attachment.data}`,
                detail: 'auto'
              }
            });
          }
        }

        openaiMessages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        openaiMessages.push({
          role: lastMessage.role as 'user' | 'assistant',
          content: lastMessage.content
        });
      }
    }

    // Some newer models only support default temperature (1.0)
    const modelsRequiringDefaultTemp = ['gpt-5', 'gpt-5-high', 'o1', 'o3'];
    const useDefaultTemp = modelsRequiringDefaultTemp.includes(agent.model);
    
    const requestParams: any = {
      model: agent.model,
      messages: openaiMessages,
      max_completion_tokens: agent.max_tokens,
      stream: true, // Enable streaming
      stream_options: { include_usage: true }, // Request token usage in stream
    };

    // Only include temperature if the model supports it
    if (!useDefaultTemp) {
      requestParams.temperature = agent.temperature;
    }

    try {
      const stream = await this.openai.chat.completions.create(requestParams);

      return {
        stream: this.processOpenAIStream(stream, agent, userId, projectId, conversationId, projectFiles)
      };
    } catch (error: any) {
      logger.error('OpenAI streaming API error details:', {
        error: error?.message, model: agent.model, status: error?.status
      });
      if (isAppError(error)) throw error;
      throw this.classifyProviderError(error, 'openai', agent.model);
    }
  }

  private async *processOpenAIStream(
    stream: any,
    agent: Agent,
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): AsyncGenerator<string | ChatResponse, void, unknown> {
    const streamStartTime = Date.now();
    let fullContent = '';
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let streamError: Error | null = null;
    let tokensTracked = false;

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullContent += delta.content;
          yield delta.content;
        }

        // Get usage from the last chunk
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens || 0;
          promptTokens = chunk.usage.prompt_tokens || 0;
          completionTokens = chunk.usage.completion_tokens || 0;
        }
      }

      // Fallback: estimate tokens if stream didn't include usage data
      if (totalTokens === 0 && fullContent.length > 0) {
        completionTokens = TokenService.estimateTokens(fullContent);
        // Estimate prompt tokens from messages (rough approximation)
        promptTokens = 0;
        totalTokens = promptTokens + completionTokens;
        logger.warn('OpenAI stream did not include usage data, using estimated tokens', {
          model: agent.model,
          estimatedCompletionTokens: completionTokens
        });
      }

      // Track token usage if user context is provided
      if (userId && totalTokens > 0) {
        await TokenService.trackUsage({
          userId,
          projectId,
          agentId: agent.id,
          conversationId,
          provider: 'openai',
          model: agent.model,
          promptTokens,
          completionTokens,
          requestType: 'chat_stream'
        });
        tokensTracked = true;
      }

      const estimatedCost = TokenService.calculateCost('openai', agent.model, promptTokens, completionTokens);

      const streamProcessingTime = Date.now() - streamStartTime;
      try { recordAiRequest(agent.provider, agent.model, 'success', streamProcessingTime / 1000, promptTokens, completionTokens); } catch (e) { logger.debug('Analytics tracking failed', { error: e }); }

      if (userId) {
        try {
          posthogEvents.chatMessageSent(userId, { provider: agent.provider, model: agent.model, tokensUsed: totalTokens, promptTokens, completionTokens, responseTimeMs: streamProcessingTime });
        } catch (e) { logger.debug('PostHog chat tracking failed', { error: e }); }
      }

      // Yield the final response (not return!) so the for-await-of loop can process it
      yield {
        content: fullContent,
        metadata: {
          model: agent.model,
          tokens: totalTokens,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          estimated_cost: estimatedCost,
          files: projectFiles
        }
      };
    } catch (error) {
      streamError = error as Error;
      logger.error('OpenAI streaming error:', error);
      throw error;
    } finally {
      // Track partial usage if stream failed and we have content but haven't tracked yet
      if (streamError && userId && fullContent.length > 0 && !tokensTracked) {
        try {
          // Estimate tokens for partial content if we don't have actual counts
          const estimatedCompletionTokens = completionTokens > 0
            ? completionTokens
            : TokenService.estimateTokens(fullContent);

          logger.warn('Tracking partial token usage after stream failure', {
            userId,
            model: agent.model,
            estimatedTokens: estimatedCompletionTokens,
            contentLength: fullContent.length
          });

          await TokenService.trackUsage({
            userId,
            projectId,
            agentId: agent.id,
            conversationId,
            provider: 'openai',
            model: agent.model,
            promptTokens: promptTokens || 0,
            completionTokens: estimatedCompletionTokens,
            requestType: 'chat_stream_partial'
          });
        } catch (trackingError) {
          logger.error('Failed to track partial token usage:', trackingError);
        }
      }
    }
  }

  private async chatWithAnthropic(
    agent: Agent,
    messages: ConversationMessage[],
    systemContent: string,
    attachments?: ChatFileAttachment[],
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): Promise<ChatResponse> {
    logger.info(`Anthropic client check: ${!!this.anthropic}`);
    logger.info(`Anthropic messages check: ${!!this.anthropic?.messages}`);

    if (!this.anthropic) {
      throw createAIApiKeyInvalidError('anthropic');
    }

    const actualModel = agent.model;

    // Convert messages to Anthropic format with multimodal support
    const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.slice(0, -1).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Handle the last message with potential attachments
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (attachments && attachments.length > 0 && lastMessage.role === 'user') {
        // Build multimodal content for the last user message
        const contentParts: Anthropic.Messages.ContentBlockParam[] = [];

        // Add images first
        for (const attachment of attachments) {
          if (attachment.mimetype.startsWith('image/')) {
            const mediaType = normalizeImageMimeType(attachment.mimetype);
            if (mediaType) {
              contentParts.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: attachment.data
                }
              });
            }
          } else if (attachment.mimetype === 'application/pdf') {
            // Anthropic supports PDF as document type
            contentParts.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: attachment.data
              }
            } as any); // Type assertion needed for document type
          }
        }

        // Add text last
        contentParts.push({
          type: 'text',
          text: lastMessage.content
        });

        anthropicMessages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        anthropicMessages.push({
          role: lastMessage.role as 'user' | 'assistant',
          content: lastMessage.content
        });
      }
    }

    try {
      return await Sentry.startSpan(
        { name: `ai.chat anthropic/${actualModel}`, op: 'ai.chat', attributes: { 'ai.provider': 'anthropic', 'ai.model': actualModel } },
        async () => {
          const completion = await this.anthropic!.messages.create({
            model: actualModel,
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

          const pTokens = completion.usage?.input_tokens || 0;
          const cTokens = completion.usage?.output_tokens || 0;
          const estimatedCost = TokenService.calculateCost('anthropic', agent.model, pTokens, cTokens);

          return {
            content: content.text,
            metadata: {
              model: agent.model,
              tokens: completion.usage ? pTokens + cTokens : 0,
              prompt_tokens: pTokens,
              completion_tokens: cTokens,
              estimated_cost: estimatedCost,
              files: projectFiles
            }
          };
        }
      );
    } catch (error: any) {
      logger.error('Anthropic API error details:', {
        error: error?.message, model: agent.model, status: error?.status
      });
      if (isAppError(error)) throw error;
      throw this.classifyProviderError(error, 'anthropic', agent.model);
    }
  }

  private async streamChatWithAnthropic(
    agent: Agent,
    messages: ConversationMessage[],
    systemContent: string,
    attachments?: ChatFileAttachment[],
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): Promise<StreamingChatResponse> {
    logger.info(`Anthropic client check: ${!!this.anthropic}`);
    logger.info(`Anthropic messages check: ${!!this.anthropic?.messages}`);

    if (!this.anthropic) {
      throw createAIApiKeyInvalidError('anthropic');
    }

    const actualModel = agent.model;

    // Convert messages to Anthropic format with multimodal support
    const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.slice(0, -1).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Handle the last message with potential attachments
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (attachments && attachments.length > 0 && lastMessage.role === 'user') {
        // Build multimodal content for the last user message
        const contentParts: Anthropic.Messages.ContentBlockParam[] = [];

        // Add images first
        for (const attachment of attachments) {
          if (attachment.mimetype.startsWith('image/')) {
            const mediaType = normalizeImageMimeType(attachment.mimetype);
            if (mediaType) {
              contentParts.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: attachment.data
                }
              });
            }
          } else if (attachment.mimetype === 'application/pdf') {
            contentParts.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: attachment.data
              }
            } as any);
          }
        }

        // Add text last
        contentParts.push({
          type: 'text',
          text: lastMessage.content
        });

        anthropicMessages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        anthropicMessages.push({
          role: lastMessage.role as 'user' | 'assistant',
          content: lastMessage.content
        });
      }
    }

    try {
      const stream = await this.anthropic.messages.create({
        model: actualModel,
        max_tokens: agent.max_tokens,
        temperature: agent.temperature,
        system: systemContent,
        messages: anthropicMessages,
        stream: true,
      });

      return {
        stream: this.processAnthropicStream(stream, agent, userId, projectId, conversationId, projectFiles)
      };
    } catch (error: any) {
      logger.error('Anthropic streaming API error details:', {
        error: error?.message, model: agent.model, status: error?.status
      });
      if (isAppError(error)) throw error;
      throw this.classifyProviderError(error, 'anthropic', agent.model);
    }
  }

  private async *processAnthropicStream(
    stream: any,
    agent: Agent,
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): AsyncGenerator<string | ChatResponse, void, unknown> {
    const streamStartTime = Date.now();
    let fullContent = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let streamError: Error | null = null;
    let tokensTracked = false;

    try {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          fullContent += chunk.delta.text;
          yield chunk.delta.text;
        }

        // Get usage information from message_delta events
        if (chunk.type === 'message_delta' && chunk.usage) {
          totalOutputTokens = chunk.usage.output_tokens || 0;
        }

        // Get input tokens from message_start events
        if (chunk.type === 'message_start' && chunk.message?.usage) {
          totalInputTokens = chunk.message.usage.input_tokens || 0;
        }
      }

      const totalTokens = totalInputTokens + totalOutputTokens;

      // Track token usage if user context is provided
      if (userId && totalTokens > 0) {
        await TokenService.trackUsage({
          userId,
          projectId,
          agentId: agent.id,
          conversationId,
          provider: 'anthropic',
          model: agent.model,
          promptTokens: totalInputTokens,
          completionTokens: totalOutputTokens,
          requestType: 'chat_stream'
        });
        tokensTracked = true;
      }

      const estimatedCost = TokenService.calculateCost('anthropic', agent.model, totalInputTokens, totalOutputTokens);

      const anthropicStreamProcessingTime = Date.now() - streamStartTime;
      try { recordAiRequest(agent.provider, agent.model, 'success', anthropicStreamProcessingTime / 1000, totalInputTokens, totalOutputTokens); } catch (e) { logger.debug('Analytics tracking failed', { error: e }); }

      if (userId) {
        try {
          posthogEvents.chatMessageSent(userId, { provider: agent.provider, model: agent.model, tokensUsed: totalTokens, promptTokens: totalInputTokens, completionTokens: totalOutputTokens, responseTimeMs: anthropicStreamProcessingTime });
        } catch (e) { logger.debug('PostHog chat tracking failed', { error: e }); }
      }

      // Yield the final response (not return!) so the for-await-of loop can process it
      yield {
        content: fullContent,
        metadata: {
          model: agent.model,
          tokens: totalTokens,
          prompt_tokens: totalInputTokens,
          completion_tokens: totalOutputTokens,
          estimated_cost: estimatedCost,
          files: projectFiles
        }
      };
    } catch (error) {
      streamError = error as Error;
      logger.error('Anthropic streaming error:', error);
      throw error;
    } finally {
      // Track partial usage if stream failed and we have content but haven't tracked yet
      if (streamError && userId && fullContent.length > 0 && !tokensTracked) {
        try {
          // Estimate tokens for partial content if we don't have actual counts
          const estimatedOutputTokens = totalOutputTokens > 0
            ? totalOutputTokens
            : TokenService.estimateTokens(fullContent);

          logger.warn('Tracking partial token usage after Anthropic stream failure', {
            userId,
            model: agent.model,
            estimatedTokens: estimatedOutputTokens,
            contentLength: fullContent.length
          });

          await TokenService.trackUsage({
            userId,
            projectId,
            agentId: agent.id,
            conversationId,
            provider: 'anthropic',
            model: agent.model,
            promptTokens: totalInputTokens || 0,
            completionTokens: estimatedOutputTokens,
            requestType: 'chat_stream_partial'
          });
        } catch (trackingError) {
          logger.error('Failed to track partial Anthropic token usage:', trackingError);
        }
      }
    }
  }

  private async chatWithOpenRouter(
    agent: Agent,
    messages: ConversationMessage[],
    systemContent: string,
    attachments?: ChatFileAttachment[],
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): Promise<ChatResponse> {
    if (!this.openrouter) {
      throw createAIApiKeyInvalidError('openrouter');
    }

    // Validate model format
    this.validateOpenRouterModel(agent.model);

    // Convert messages to OpenAI format (OpenRouter is OpenAI-compatible)
    const openrouterMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...messages.slice(0, -1).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    // Handle the last message with potential attachments
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (attachments && attachments.length > 0 && lastMessage.role === 'user') {
        // Build multimodal content for the last user message
        const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
          { type: 'text', text: lastMessage.content }
        ];

        for (const attachment of attachments) {
          if (attachment.mimetype.startsWith('image/')) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimetype};base64,${attachment.data}`,
                detail: 'auto'
              }
            });
          }
        }

        openrouterMessages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        openrouterMessages.push({
          role: lastMessage.role as 'user' | 'assistant',
          content: lastMessage.content
        });
      }
    }

    // Build request params with conditional temperature
    const requestParams: any = {
      model: agent.model,
      messages: openrouterMessages,
      max_tokens: agent.max_tokens,
    };

    // Only include temperature if the model supports it
    if (this.modelSupportsTemperature(agent.model)) {
      requestParams.temperature = agent.temperature;
    }

    try {
      return await Sentry.startSpan(
        { name: `ai.chat openrouter/${agent.model}`, op: 'ai.chat', attributes: { 'ai.provider': 'openrouter', 'ai.model': agent.model } },
        async () => {
          const completion = await this.openrouter!.chat.completions.create(requestParams);

          const choice = completion.choices[0];
          if (!choice.message.content) {
            throw new Error('No response content from OpenRouter');
          }

          const promptTokens = completion.usage?.prompt_tokens || 0;
          const completionTokens = completion.usage?.completion_tokens || 0;
          const totalTokens = completion.usage?.total_tokens || 0;

          // Track token usage if user context is provided
          if (userId && completion.usage) {
            await TokenService.trackUsage({
              userId,
              projectId,
              agentId: agent.id,
              conversationId,
              provider: 'openrouter',
              model: agent.model,
              promptTokens,
              completionTokens,
              requestType: 'chat'
            });
          }

          logger.info('OpenRouter chat completed', {
            provider: 'openrouter',
            model: agent.model,
            promptTokens,
            completionTokens,
            totalTokens
          });

          const estimatedCost = TokenService.calculateCost('openrouter', agent.model, promptTokens, completionTokens);

          return {
            content: choice.message.content,
            metadata: {
              model: agent.model,
              tokens: totalTokens,
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              estimated_cost: estimatedCost,
              files: projectFiles
            }
          };
        }
      );
    } catch (error: any) {
      logger.error('OpenRouter API error details:', {
        error: error?.message, model: agent.model, status: error?.status
      });
      if (isAppError(error)) throw error;
      throw this.classifyProviderError(error, 'openrouter', agent.model);
    }
  }

  private async streamChatWithOpenRouter(
    agent: Agent,
    messages: ConversationMessage[],
    systemContent: string,
    attachments?: ChatFileAttachment[],
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): Promise<StreamingChatResponse> {
    if (!this.openrouter) {
      throw createAIApiKeyInvalidError('openrouter');
    }

    // Validate model format
    this.validateOpenRouterModel(agent.model);

    // Convert messages to OpenAI format (OpenRouter is OpenAI-compatible)
    const openrouterMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...messages.slice(0, -1).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    // Handle the last message with potential attachments
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (attachments && attachments.length > 0 && lastMessage.role === 'user') {
        // Build multimodal content for the last user message
        const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
          { type: 'text', text: lastMessage.content }
        ];

        for (const attachment of attachments) {
          if (attachment.mimetype.startsWith('image/')) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimetype};base64,${attachment.data}`,
                detail: 'auto'
              }
            });
          }
        }

        openrouterMessages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        openrouterMessages.push({
          role: lastMessage.role as 'user' | 'assistant',
          content: lastMessage.content
        });
      }
    }

    // Build request params with conditional temperature
    const requestParams: any = {
      model: agent.model,
      messages: openrouterMessages,
      max_tokens: agent.max_tokens,
      stream: true,
      stream_options: { include_usage: true }, // Request token usage in stream
    };

    // Only include temperature if the model supports it
    if (this.modelSupportsTemperature(agent.model)) {
      requestParams.temperature = agent.temperature;
    }

    try {
      const stream = await this.openrouter.chat.completions.create(requestParams);

      return {
        stream: this.processOpenRouterStream(stream, agent, userId, projectId, conversationId, projectFiles)
      };
    } catch (error: any) {
      logger.error('OpenRouter streaming API error details:', {
        error: error?.message, model: agent.model, status: error?.status
      });
      if (isAppError(error)) throw error;
      throw this.classifyProviderError(error, 'openrouter', agent.model);
    }
  }

  private async *processOpenRouterStream(
    stream: any,
    agent: Agent,
    userId?: string,
    projectId?: string,
    conversationId?: string,
    projectFiles?: string[]
  ): AsyncGenerator<string | ChatResponse, void, unknown> {
    const streamStartTime = Date.now();
    let fullContent = '';
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let streamError: Error | null = null;
    let tokensTracked = false;

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullContent += delta.content;
          yield delta.content;
        }

        // Get usage from the last chunk
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens || 0;
          promptTokens = chunk.usage.prompt_tokens || 0;
          completionTokens = chunk.usage.completion_tokens || 0;
        }
      }

      // Fallback: estimate tokens if stream didn't include usage data
      if (totalTokens === 0 && fullContent.length > 0) {
        completionTokens = TokenService.estimateTokens(fullContent);
        promptTokens = 0;
        totalTokens = promptTokens + completionTokens;
        logger.warn('OpenRouter stream did not include usage data, using estimated tokens', {
          model: agent.model,
          estimatedCompletionTokens: completionTokens
        });
      }

      // Track token usage if user context is provided
      if (userId && totalTokens > 0) {
        await TokenService.trackUsage({
          userId,
          projectId,
          agentId: agent.id,
          conversationId,
          provider: 'openrouter',
          model: agent.model,
          promptTokens,
          completionTokens,
          requestType: 'chat_stream'
        });
        tokensTracked = true;
      }

      const estimatedCost = TokenService.calculateCost('openrouter', agent.model, promptTokens, completionTokens);

      const openrouterStreamProcessingTime = Date.now() - streamStartTime;
      try { recordAiRequest(agent.provider, agent.model, 'success', openrouterStreamProcessingTime / 1000, promptTokens, completionTokens); } catch (e) { logger.debug('Analytics tracking failed', { error: e }); }

      if (userId) {
        try {
          posthogEvents.chatMessageSent(userId, { provider: agent.provider, model: agent.model, tokensUsed: totalTokens, promptTokens, completionTokens, responseTimeMs: openrouterStreamProcessingTime });
        } catch (e) { logger.debug('PostHog chat tracking failed', { error: e }); }
      }

      logger.info('OpenRouter streaming chat completed', {
        provider: 'openrouter',
        model: agent.model,
        promptTokens,
        completionTokens,
        totalTokens,
        responseLength: fullContent.length
      });

      // Yield the final response (not return!) so the for-await-of loop can process it
      yield {
        content: fullContent,
        metadata: {
          model: agent.model,
          tokens: totalTokens,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          estimated_cost: estimatedCost,
          files: projectFiles
        }
      };
    } catch (error: any) {
      streamError = error;
      logger.error('OpenRouter streaming error:', {
        error: error.message,
        model: agent.model,
        status: error.status,
        code: error.code
      });
      throw error;
    } finally {
      // Track partial usage if stream failed and we have content but haven't tracked yet
      if (streamError && userId && fullContent.length > 0 && !tokensTracked) {
        try {
          // Estimate tokens for partial content if we don't have actual counts
          const estimatedCompletionTokens = completionTokens > 0
            ? completionTokens
            : TokenService.estimateTokens(fullContent);

          logger.warn('Tracking partial token usage after OpenRouter stream failure', {
            userId,
            model: agent.model,
            estimatedTokens: estimatedCompletionTokens,
            contentLength: fullContent.length
          });

          await TokenService.trackUsage({
            userId,
            projectId,
            agentId: agent.id,
            conversationId,
            provider: 'openrouter',
            model: agent.model,
            promptTokens: promptTokens || 0,
            completionTokens: estimatedCompletionTokens,
            requestType: 'chat_stream_partial'
          });
        } catch (trackingError) {
          logger.error('Failed to track partial OpenRouter token usage:', trackingError);
        }
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
  async isModelAvailable(provider: 'openai' | 'anthropic' | 'openrouter', model: string): Promise<boolean> {
    const { modelService } = await import('./modelService');
    const modelData = await modelService.getModelById(model);
    return modelData?.provider === provider && !!modelData;
  }

  // Get provider status
  getProviderStatus(): Record<string, boolean> {
    return {
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      openrouter: !!this.openrouter
    };
  }
}

export const aiService = new AIService();
