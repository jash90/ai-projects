import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import config from '../utils/config';
import logger from '../utils/logger';
import { AIModelModel } from '../models/AIModel';

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  description?: string;
  max_tokens: number;
  supports_vision: boolean;
  supports_function_calling: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  context_window: number;
  created_at: string;
  updated_at: string;
}

export interface ModelSyncResult {
  provider: 'openai' | 'anthropic' | 'openrouter';
  models_added: number;
  models_updated: number;
  models_removed: number;
  success: boolean;
  error?: string;
}

interface ProviderCache {
  models: AIModel[];
  timestamp: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

class ModelService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private openrouter: OpenAI | null = null;
  private providerCache: Map<string, ProviderCache> = new Map();
  private readonly CACHE_DURATION = ONE_HOUR_MS;

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

    if (config.ai.openrouter_api_key) {
      this.openrouter = new OpenAI({
        apiKey: config.ai.openrouter_api_key,
        baseURL: 'https://openrouter.ai/api/v1',
      });
    }
  }

  private getCachedModels(provider: string): AIModel[] | null {
    const cached = this.providerCache.get(provider);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age >= this.CACHE_DURATION) return null;

    logger.info(`Using cached ${provider} models (age: ${Math.round(age / 3600000)}h)`);
    return cached.models;
  }

  private setCachedModels(provider: string, models: AIModel[]): void {
    this.providerCache.set(provider, { models, timestamp: Date.now() });
  }

  /**
   * Fetch models from OpenAI API
   */
  async fetchOpenAIModels(): Promise<AIModel[]> {
    const cached = this.getCachedModels('openai');
    if (cached) return cached;

    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      logger.info('Fetching OpenAI models from API...');

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000);

      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.ai.openai_api_key}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as { data: Array<{ id: string; owned_by?: string }> };
        const now = new Date().toISOString();

        const models: AIModel[] = data.data
          .filter(m => this.isOpenAIChatModel(m.id))
          .map(m => ({
            id: m.id,
            name: this.formatModelName(m.id),
            provider: 'openai' as const,
            description: `OpenAI ${this.formatModelName(m.id)} model`,
            max_tokens: this.getOpenAIMaxTokens(m.id),
            supports_vision: this.supportsVision(m.id),
            supports_function_calling: this.supportsFunctionCalling(m.id),
            cost_per_1k_input_tokens: this.getOpenAIInputCost(m.id),
            cost_per_1k_output_tokens: this.getOpenAIOutputCost(m.id),
            context_window: this.getOpenAIContextWindow(m.id),
            created_at: now,
            updated_at: now,
          }));

        logger.info(`Fetched ${models.length} chat models from OpenAI API (filtered from ${data.data.length} total)`);
        this.setCachedModels('openai', models);
        return models;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Failed to fetch OpenAI models from API: ${msg}, using fallback`);
      return this.getDefaultOpenAIModels();
    }
  }

  /**
   * Fetch models from Anthropic API
   */
  async fetchAnthropicModels(): Promise<AIModel[]> {
    const cached = this.getCachedModels('anthropic');
    if (cached) return cached;

    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      logger.info('Fetching Anthropic models from API...');

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000);

      try {
        const response = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'anthropic-version': '2023-06-01',
            'x-api-key': config.ai.anthropic_api_key!,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Anthropic API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as {
          data: Array<{
            id: string;
            display_name?: string;
            type: string;
          }>;
        };
        const now = new Date().toISOString();

        const models: AIModel[] = data.data.map(m => ({
          id: m.id,
          name: m.display_name || m.id,
          provider: 'anthropic' as const,
          description: `Anthropic ${m.display_name || m.id} model`,
          max_tokens: this.getAnthropicMaxTokens(m.id),
          supports_vision: this.anthropicSupportsVision(m.id),
          supports_function_calling: true,
          cost_per_1k_input_tokens: this.getAnthropicInputCost(m.id),
          cost_per_1k_output_tokens: this.getAnthropicOutputCost(m.id),
          context_window: this.getAnthropicContextWindow(m.id),
          created_at: now,
          updated_at: now,
        }));

        logger.info(`Fetched ${models.length} models from Anthropic API`);
        this.setCachedModels('anthropic', models);
        return models;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Failed to fetch Anthropic models from API: ${msg}, using fallback`);
      return this.getDefaultAnthropicModels();
    }
  }

  /**
   * Fetch available models from OpenRouter API dynamically
   */
  async fetchOpenRouterModels(): Promise<AIModel[]> {
    const cached = this.getCachedModels('openrouter');
    if (cached) return cached;

    if (!this.openrouter) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      logger.info('Fetching OpenRouter models from API...');

      interface OpenRouterModelsResponse {
        data: Array<{
          id: string;
          name?: string;
          description?: string;
          pricing?: {
            prompt: string;
            completion: string;
          };
          context_length?: number;
          architecture?: {
            modality?: string[];
          };
          supported_parameters?: string[];
          top_provider?: {
            max_completion_tokens?: number;
          };
        }>;
      }

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000);

      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.ai.openrouter_api_key}`,
            'Content-Type': 'application/json',
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as OpenRouterModelsResponse;
        const now = new Date().toISOString();

        const models: AIModel[] = data.data.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          provider: 'openrouter' as const,
          description: model.description || `${model.name} model`,
          max_tokens: model.top_provider?.max_completion_tokens || model.context_length || 4096,
          supports_vision: model.architecture?.modality?.includes('image') || false,
          supports_function_calling: model.supported_parameters?.includes('tools') ||
                                    model.supported_parameters?.includes('functions') || false,
          cost_per_1k_input_tokens: parseFloat(model.pricing?.prompt || '0') * 1000,
          cost_per_1k_output_tokens: parseFloat(model.pricing?.completion || '0') * 1000,
          context_window: model.context_length || 4096,
          created_at: now,
          updated_at: now
        }));

        this.setCachedModels('openrouter', models);
        logger.info(`Loaded ${models.length} OpenRouter models from API`);
        return models;

      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');

      logger.warn('Using fallback OpenRouter models list - API may be unavailable', {
        reason: isTimeout ? 'Request timeout (10s)' : errorMessage,
      });

      return this.getDefaultOpenRouterModels();
    }
  }

  /**
   * Fallback OpenAI models when API is unavailable
   */
  private getDefaultOpenAIModels(): AIModel[] {
    const now = new Date().toISOString();
    const fallback = [
      { id: 'gpt-4o', name: 'GPT-4o', max_tokens: 16384, context_window: 128000, input: 2.50, output: 10.00, vision: true, functions: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', max_tokens: 16384, context_window: 128000, input: 0.15, output: 0.60, vision: true, functions: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', max_tokens: 4096, context_window: 128000, input: 10.00, output: 30.00, vision: true, functions: true },
      { id: 'o3', name: 'O3', max_tokens: 100000, context_window: 200000, input: 10.00, output: 40.00, vision: true, functions: true },
      { id: 'o3-mini', name: 'O3 Mini', max_tokens: 100000, context_window: 200000, input: 1.10, output: 4.40, vision: true, functions: true },
      { id: 'o1', name: 'O1', max_tokens: 100000, context_window: 200000, input: 15.00, output: 60.00, vision: true, functions: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', max_tokens: 32768, context_window: 1047576, input: 2.00, output: 8.00, vision: true, functions: true },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', max_tokens: 32768, context_window: 1047576, input: 0.40, output: 1.60, vision: true, functions: true },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', max_tokens: 32768, context_window: 1047576, input: 0.10, output: 0.40, vision: true, functions: true },
    ];
    return fallback.map(m => ({
      id: m.id, name: m.name, provider: 'openai' as const,
      description: `OpenAI ${m.name} model`,
      max_tokens: m.max_tokens, context_window: m.context_window,
      cost_per_1k_input_tokens: m.input, cost_per_1k_output_tokens: m.output,
      supports_vision: m.vision, supports_function_calling: m.functions,
      created_at: now, updated_at: now,
    }));
  }

  /**
   * Fallback Anthropic models when API is unavailable
   */
  private getDefaultAnthropicModels(): AIModel[] {
    const now = new Date().toISOString();
    const fallback = [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', max_tokens: 32000, context_window: 200000, input: 15.00, output: 75.00, vision: true },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', max_tokens: 16000, context_window: 200000, input: 3.00, output: 15.00, vision: true },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', max_tokens: 8192, context_window: 200000, input: 0.80, output: 4.00, vision: true },
      { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5', max_tokens: 16000, context_window: 200000, input: 3.00, output: 15.00, vision: true },
    ];
    return fallback.map(m => ({
      id: m.id, name: m.name, provider: 'anthropic' as const,
      description: `Anthropic ${m.name} model`,
      max_tokens: m.max_tokens, context_window: m.context_window,
      cost_per_1k_input_tokens: m.input, cost_per_1k_output_tokens: m.output,
      supports_vision: m.vision, supports_function_calling: true,
      created_at: now, updated_at: now,
    }));
  }

  /**
   * Fallback OpenRouter models when API is unavailable
   */
  private getDefaultOpenRouterModels(): AIModel[] {
    const now = new Date().toISOString();
    const fallback = [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', max_tokens: 8192, context_window: 200000, input: 3.00, output: 15.00, vision: true, functions: true },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', max_tokens: 4096, context_window: 200000, input: 15.00, output: 75.00, vision: true, functions: true },
      { id: 'openai/gpt-4o', name: 'GPT-4o', max_tokens: 4096, context_window: 128000, input: 5.00, output: 15.00, vision: true, functions: true },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', max_tokens: 16384, context_window: 128000, input: 0.15, output: 0.60, vision: true, functions: true },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', max_tokens: 8192, context_window: 8192, input: 3.50, output: 10.50, vision: true, functions: true },
      { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', max_tokens: 8192, context_window: 8192, input: 0.35, output: 1.05, vision: true, functions: true },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', max_tokens: 4096, context_window: 128000, input: 2.70, output: 2.70, vision: false, functions: true },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', max_tokens: 4096, context_window: 128000, input: 0.88, output: 0.88, vision: false, functions: true },
      { id: 'mistralai/mistral-large', name: 'Mistral Large', max_tokens: 4096, context_window: 128000, input: 3.00, output: 9.00, vision: false, functions: true },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', max_tokens: 4096, context_window: 64000, input: 0.14, output: 0.28, vision: false, functions: true },
    ];
    return fallback.map(m => ({
      id: m.id, name: m.name, provider: 'openrouter' as const,
      description: `OpenRouter ${m.name} model`,
      max_tokens: m.max_tokens, context_window: m.context_window,
      cost_per_1k_input_tokens: m.input, cost_per_1k_output_tokens: m.output,
      supports_vision: m.vision, supports_function_calling: m.functions,
      created_at: now, updated_at: now,
    }));
  }

  /**
   * Sync models from all configured providers
   */
  async syncAllModels(): Promise<ModelSyncResult[]> {
    const results: ModelSyncResult[] = [];

    // Sync OpenAI models
    if (this.openai) {
      try {
        const models = await this.fetchOpenAIModels();
        const result = await this.syncModelsToDatabase('openai', models);
        results.push(result);
      } catch (error) {
        results.push({
          provider: 'openai',
          models_added: 0,
          models_updated: 0,
          models_removed: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Sync Anthropic models
    if (this.anthropic) {
      try {
        const models = await this.fetchAnthropicModels();
        const result = await this.syncModelsToDatabase('anthropic', models);
        results.push(result);
      } catch (error) {
        results.push({
          provider: 'anthropic',
          models_added: 0,
          models_updated: 0,
          models_removed: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Sync OpenRouter models
    if (this.openrouter) {
      try {
        const models = await this.fetchOpenRouterModels();
        const result = await this.syncModelsToDatabase('openrouter', models);
        results.push(result);
      } catch (error) {
        results.push({
          provider: 'openrouter',
          models_added: 0,
          models_updated: 0,
          models_removed: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Sync models to database
   */
  private async syncModelsToDatabase(provider: 'openai' | 'anthropic' | 'openrouter', models: AIModel[]): Promise<ModelSyncResult> {
    try {
      logger.info(`Syncing ${models.length} ${provider} models to database...`);

      const { added, updated } = await AIModelModel.bulkUpsert(models);
      const activeModelIds = models.map(m => m.id);
      const removed = await AIModelModel.deactivateModels(provider, activeModelIds);

      logger.info(`Model sync completed for ${provider}: ${added} added, ${updated} updated, ${removed} removed`);

      return {
        provider,
        models_added: added,
        models_updated: updated,
        models_removed: removed,
        success: true
      };
    } catch (error) {
      logger.error(`Failed to sync ${provider} models to database`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        provider,
        models_added: 0,
        models_updated: 0,
        models_removed: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // --- OpenAI model metadata helpers ---

  private isOpenAIChatModel(modelId: string): boolean {
    const prefixes = [
      'gpt-4', 'gpt-3.5-turbo', 'o1', 'o3', 'o4',
      'chatgpt-4o', 'gpt-4.1', 'gpt-4.5',
    ];
    return prefixes.some(p => modelId.startsWith(p));
  }

  private getOpenAIMaxTokens(modelId: string): number {
    if (modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) return 100000;
    if (modelId.includes('gpt-4.1') || modelId.includes('gpt-4.5')) return 32768;
    if (modelId.includes('gpt-4o')) return 16384;
    if (modelId.includes('gpt-4-turbo')) return 4096;
    if (modelId.includes('gpt-4-32k')) return 32768;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo-16k')) return 16384;
    if (modelId.includes('gpt-3.5-turbo')) return 4096;
    return 4096;
  }

  private getOpenAIContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4.1') || modelId.includes('gpt-4.5')) return 1047576;
    if (modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) return 200000;
    if (modelId.includes('gpt-4o')) return 128000;
    if (modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4-32k')) return 32768;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo-16k')) return 16384;
    if (modelId.includes('gpt-3.5-turbo')) return 16385;
    return 4096;
  }

  private supportsVision(modelId: string): boolean {
    if (modelId.includes('gpt-4o')) return true;
    if (modelId.includes('gpt-4-turbo')) return true;
    if (modelId.includes('gpt-4.1')) return true;
    if (modelId.includes('gpt-4.5')) return true;
    if (modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) return true;
    return false;
  }

  private supportsFunctionCalling(modelId: string): boolean {
    // Most modern OpenAI chat models support function calling
    if (modelId.includes('gpt-4') || modelId.includes('gpt-3.5-turbo')) return true;
    if (modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) return true;
    return false;
  }

  private getOpenAIInputCost(modelId: string): number {
    if (modelId.includes('gpt-4.1-nano')) return 0.10;
    if (modelId.includes('gpt-4.1-mini')) return 0.40;
    if (modelId.includes('gpt-4.1')) return 2.00;
    if (modelId.includes('gpt-4.5')) return 75.00;
    if (modelId.includes('gpt-4o-mini')) return 0.15;
    if (modelId.includes('gpt-4o')) return 2.50;
    if (modelId.includes('gpt-4-turbo')) return 10.00;
    if (modelId.includes('gpt-4-32k')) return 60.00;
    if (modelId.includes('gpt-4')) return 30.00;
    if (modelId.includes('gpt-3.5-turbo')) return 0.50;
    if (modelId === 'o3') return 10.00;
    if (modelId.startsWith('o3-mini')) return 1.10;
    if (modelId === 'o1') return 15.00;
    if (modelId.startsWith('o1-mini')) return 3.00;
    if (modelId.startsWith('o4-mini')) return 1.10;
    return 1.00;
  }

  private getOpenAIOutputCost(modelId: string): number {
    if (modelId.includes('gpt-4.1-nano')) return 0.40;
    if (modelId.includes('gpt-4.1-mini')) return 1.60;
    if (modelId.includes('gpt-4.1')) return 8.00;
    if (modelId.includes('gpt-4.5')) return 150.00;
    if (modelId.includes('gpt-4o-mini')) return 0.60;
    if (modelId.includes('gpt-4o')) return 10.00;
    if (modelId.includes('gpt-4-turbo')) return 30.00;
    if (modelId.includes('gpt-4-32k')) return 120.00;
    if (modelId.includes('gpt-4')) return 60.00;
    if (modelId.includes('gpt-3.5-turbo')) return 1.50;
    if (modelId === 'o3') return 40.00;
    if (modelId.startsWith('o3-mini')) return 4.40;
    if (modelId === 'o1') return 60.00;
    if (modelId.startsWith('o1-mini')) return 12.00;
    if (modelId.startsWith('o4-mini')) return 4.40;
    return 4.00;
  }

  private formatModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'gpt-4.5-preview': 'GPT-4.5 Preview',
      'gpt-4.1': 'GPT-4.1',
      'gpt-4.1-mini': 'GPT-4.1 Mini',
      'gpt-4.1-nano': 'GPT-4.1 Nano',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'o4-mini': 'O4 Mini',
      'o3-mini': 'O3 Mini',
      'o3': 'O3',
      'o1-mini': 'O1 Mini',
      'o1': 'O1',
    };

    for (const [key, value] of Object.entries(nameMap)) {
      if (modelId.startsWith(key)) {
        return value;
      }
    }

    return modelId;
  }

  // --- Anthropic model metadata helpers ---

  private getAnthropicMaxTokens(modelId: string): number {
    if (modelId.includes('opus')) return 32000;
    if (modelId.includes('sonnet')) return 16000;
    if (modelId.includes('haiku')) return 8192;
    return 8192;
  }

  private getAnthropicContextWindow(modelId: string): number {
    return 200000;
  }

  private anthropicSupportsVision(modelId: string): boolean {
    return true; // All Claude 3+ models support vision
  }

  private getAnthropicInputCost(modelId: string): number {
    if (modelId.includes('opus-4')) return 15.00;
    if (modelId.includes('sonnet-4-5') || modelId.includes('sonnet-4.5')) return 3.00;
    if (modelId.includes('sonnet-4')) return 3.00;
    if (modelId.includes('haiku-4')) return 0.80;
    if (modelId.includes('opus-3')) return 15.00;
    if (modelId.includes('sonnet-3')) return 3.00;
    if (modelId.includes('haiku-3')) return 0.25;
    return 3.00;
  }

  private getAnthropicOutputCost(modelId: string): number {
    if (modelId.includes('opus-4')) return 75.00;
    if (modelId.includes('sonnet-4-5') || modelId.includes('sonnet-4.5')) return 15.00;
    if (modelId.includes('sonnet-4')) return 15.00;
    if (modelId.includes('haiku-4')) return 4.00;
    if (modelId.includes('opus-3')) return 75.00;
    if (modelId.includes('sonnet-3')) return 15.00;
    if (modelId.includes('haiku-3')) return 1.25;
    return 15.00;
  }

  // --- Public query methods ---

  async getAvailableModels(): Promise<AIModel[]> {
    return await AIModelModel.findAll();
  }

  async getModelsByProvider(provider: 'openai' | 'anthropic' | 'openrouter'): Promise<AIModel[]> {
    return await AIModelModel.findByProvider(provider);
  }

  async getModelById(id: string): Promise<AIModel | null> {
    return await AIModelModel.findById(id);
  }

  async getProviderStats(): Promise<Record<string, { active: number; total: number }>> {
    return await AIModelModel.getProviderStats();
  }

  getProviderStatus(): Record<string, boolean> {
    return {
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      openrouter: !!this.openrouter
    };
  }

  /**
   * Clear cache for a specific provider or all providers
   */
  clearCache(provider?: string): void {
    if (provider) {
      this.providerCache.delete(provider);
      logger.info(`${provider} models cache cleared`);
    } else {
      this.providerCache.clear();
      logger.info('All models cache cleared');
    }
  }

  // Keep backward compat alias
  clearOpenRouterCache(): void {
    this.clearCache('openrouter');
  }

  getCacheStatus(): Record<string, { cached: boolean; age?: number; count?: number }> {
    const status: Record<string, { cached: boolean; age?: number; count?: number }> = {};
    for (const provider of ['openai', 'anthropic', 'openrouter']) {
      const cached = this.providerCache.get(provider);
      if (!cached) {
        status[provider] = { cached: false };
      } else {
        status[provider] = {
          cached: true,
          age: Math.round((Date.now() - cached.timestamp) / 3600000), // hours
          count: cached.models.length,
        };
      }
    }
    return status;
  }

  getOpenRouterCacheStatus(): { cached: boolean; age?: number; count?: number } {
    return this.getCacheStatus().openrouter;
  }

  /**
   * Initialize model service - create tables and sync models
   */
  async initialize(): Promise<void> {
    try {
      await AIModelModel.createTable();
      logger.info('Model service initialized successfully');
      await this.syncAllModels();
    } catch (error) {
      logger.error('Failed to initialize model service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const modelService = new ModelService();
