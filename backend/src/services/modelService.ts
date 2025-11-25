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

class ModelService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private openrouter: OpenAI | null = null;
  private openrouterModelsCache: { models: AIModel[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

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

  /**
   * Get custom OpenAI models list
   */
  async fetchOpenAIModels(): Promise<AIModel[]> {
    logger.info('Loading custom OpenAI models...');
    
    const now = new Date().toISOString();
    const customModels = [
      {
        id: 'gpt-5',
        name: 'GPT-5',
        description: 'OpenAI GPT-5 model',
        max_tokens: 4096,
        context_window: 128000,
        cost_per_1k_input_tokens: 10.00,
        cost_per_1k_output_tokens: 30.00,
        supports_vision: true,
        supports_function_calling: true
      },
      {
        id: 'gpt-5-high',
        name: 'GPT-5 High',
        description: 'OpenAI GPT-5 High performance model',
        max_tokens: 4096,
        context_window: 200000,
        cost_per_1k_input_tokens: 15.00,
        cost_per_1k_output_tokens: 45.00,
        supports_vision: true,
        supports_function_calling: true
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'OpenAI GPT-4o model',
        max_tokens: 4096,
        context_window: 128000,
        cost_per_1k_input_tokens: 5.00,
        cost_per_1k_output_tokens: 15.00,
        supports_vision: true,
        supports_function_calling: true
      },
      {
        id: 'o3',
        name: 'O3',
        description: 'OpenAI O3 model',
        max_tokens: 4096,
        context_window: 200000,
        cost_per_1k_input_tokens: 20.00,
        cost_per_1k_output_tokens: 60.00,
        supports_vision: true,
        supports_function_calling: true
      },
      {
        id: 'o1',
        name: 'O1',
        description: 'OpenAI O1 model',
        max_tokens: 4096,
        context_window: 128000,
        cost_per_1k_input_tokens: 15.00,
        cost_per_1k_output_tokens: 60.00,
        supports_vision: false,
        supports_function_calling: true
      },
      {
        id: 'o4-mini',
        name: 'O4 Mini',
        description: 'OpenAI O4 Mini model',
        max_tokens: 4096,
        context_window: 128000,
        cost_per_1k_input_tokens: 0.15,
        cost_per_1k_output_tokens: 0.60,
        supports_vision: false,
        supports_function_calling: true
      }
    ];

    const models: AIModel[] = customModels.map(model => ({
      id: model.id,
      name: model.name,
      provider: 'openai',
      description: model.description,
      max_tokens: model.max_tokens,
      context_window: model.context_window,
      cost_per_1k_input_tokens: model.cost_per_1k_input_tokens,
      cost_per_1k_output_tokens: model.cost_per_1k_output_tokens,
      supports_vision: model.supports_vision,
      supports_function_calling: model.supports_function_calling,
      created_at: now,
      updated_at: now
    }));

    logger.info(`Loaded ${models.length} custom OpenAI models`);
    return models;
  }

  /**
   * Fetch available models from Anthropic (static list since they don't have a models API)
   */
  async fetchAnthropicModels(): Promise<AIModel[]> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      logger.info('Loading Anthropic models...');
      const now = new Date().toISOString();

      // Custom Anthropic models list (as requested by user)
      const anthropicModels = [
        {
          id: 'claude-opus-4-1-20250805',
          name: 'Claude Opus 4.1 (August 2025)',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 20.00,
          output_cost: 80.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'claude-opus-4-20250514',
          name: 'Claude Opus 4 (May 2025)',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 18.00,
          output_cost: 75.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'claude-sonnet-4-20250514',
          name: 'Claude Sonnet 4 (May 2025)',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 8.00,
          output_cost: 25.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'claude-3-7-sonnet-latest',
          name: 'Claude 3.7 Sonnet (Latest)',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 5.00,
          output_cost: 20.00,
          supports_vision: true,
          supports_function_calling: true
        }
      ];

      const models: AIModel[] = anthropicModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: 'anthropic' as const,
        description: `Anthropic ${model.name} model`,
        max_tokens: model.max_tokens,
        supports_vision: model.supports_vision,
        supports_function_calling: model.supports_function_calling,
        cost_per_1k_input_tokens: model.input_cost,
        cost_per_1k_output_tokens: model.output_cost,
        context_window: model.context_window,
        created_at: now,
        updated_at: now
      }));

      logger.info(`Loaded ${models.length} Anthropic models`);
      return models;
    } catch (error) {
      logger.error('Failed to load Anthropic models', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Fetch available models from OpenRouter API dynamically
   */
  async fetchOpenRouterModels(): Promise<AIModel[]> {
    if (!this.openrouter) {
      throw new Error('OpenRouter API key not configured');
    }

    // Check cache first
    if (this.openrouterModelsCache) {
      const cacheAge = Date.now() - this.openrouterModelsCache.timestamp;
      if (cacheAge < this.CACHE_DURATION) {
        logger.info(`Using cached OpenRouter models (age: ${Math.round(cacheAge / 60000)}min)`);
        return this.openrouterModelsCache.models;
      }
    }

    try {
      logger.info('Fetching OpenRouter models from API...');

      // Define the API response interface
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

      // Fetch models from OpenRouter API with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout

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

        // Transform API response to our AIModel format
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

        // Cache the results
        this.openrouterModelsCache = {
          models,
          timestamp: Date.now()
        };

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
        fallbackModelCount: 43, // Number of models in fallback list
        suggestion: 'Check OpenRouter API status or network connectivity'
      });

      // Fallback to curated list of popular models
      return this.getDefaultOpenRouterModels();
    }
  }

  /**
   * Get default fallback OpenRouter models
   */
  private getDefaultOpenRouterModels(): AIModel[] {
    const now = new Date().toISOString();

      // Comprehensive OpenRouter models list
      const openrouterModels = [
        // Anthropic Models
        {
          id: 'anthropic/claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 3.00,
          output_cost: 15.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'anthropic/claude-3-opus',
          name: 'Claude 3 Opus',
          max_tokens: 4096,
          context_window: 200000,
          input_cost: 15.00,
          output_cost: 75.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'anthropic/claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          max_tokens: 4096,
          context_window: 200000,
          input_cost: 3.00,
          output_cost: 15.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'anthropic/claude-3-haiku',
          name: 'Claude 3 Haiku',
          max_tokens: 4096,
          context_window: 200000,
          input_cost: 0.25,
          output_cost: 1.25,
          supports_vision: true,
          supports_function_calling: true
        },
        // OpenAI Models
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 5.00,
          output_cost: 15.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'openai/gpt-4o-mini',
          name: 'GPT-4o Mini',
          max_tokens: 16384,
          context_window: 128000,
          input_cost: 0.15,
          output_cost: 0.60,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'openai/gpt-4-turbo',
          name: 'GPT-4 Turbo',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 10.00,
          output_cost: 30.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'openai/gpt-4',
          name: 'GPT-4',
          max_tokens: 8192,
          context_window: 8192,
          input_cost: 30.00,
          output_cost: 60.00,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'openai/gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          max_tokens: 4096,
          context_window: 16385,
          input_cost: 0.50,
          output_cost: 1.50,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'openai/o1-preview',
          name: 'O1 Preview',
          max_tokens: 32768,
          context_window: 128000,
          input_cost: 15.00,
          output_cost: 60.00,
          supports_vision: false,
          supports_function_calling: false
        },
        {
          id: 'openai/o1-mini',
          name: 'O1 Mini',
          max_tokens: 65536,
          context_window: 128000,
          input_cost: 3.00,
          output_cost: 12.00,
          supports_vision: false,
          supports_function_calling: false
        },
        // Google Models
        {
          id: 'google/gemini-pro-1.5',
          name: 'Gemini Pro 1.5',
          max_tokens: 8192,
          context_window: 8192,
          input_cost: 3.50,
          output_cost: 10.50,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'google/gemini-flash-1.5',
          name: 'Gemini Flash 1.5',
          max_tokens: 8192,
          context_window: 8192,
          input_cost: 0.35,
          output_cost: 1.05,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'google/gemini-2.0-flash-exp',
          name: 'Gemini 2.0 Flash (Experimental)',
          max_tokens: 8192,
          context_window: 8192,
          input_cost: 0.00,
          output_cost: 0.00,
          supports_vision: true,
          supports_function_calling: true
        },
        // Meta Llama Models
        {
          id: 'meta-llama/llama-3.1-405b-instruct',
          name: 'Llama 3.1 405B Instruct',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 2.70,
          output_cost: 2.70,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'meta-llama/llama-3.1-70b-instruct',
          name: 'Llama 3.1 70B Instruct',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.88,
          output_cost: 0.88,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'meta-llama/llama-3.1-8b-instruct',
          name: 'Llama 3.1 8B Instruct',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.10,
          output_cost: 0.10,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'meta-llama/llama-3.2-90b-vision-instruct',
          name: 'Llama 3.2 90B Vision Instruct',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.90,
          output_cost: 0.90,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'meta-llama/llama-3.2-11b-vision-instruct',
          name: 'Llama 3.2 11B Vision Instruct',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.18,
          output_cost: 0.18,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'meta-llama/llama-3.2-3b-instruct',
          name: 'Llama 3.2 3B Instruct',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.06,
          output_cost: 0.06,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'meta-llama/llama-3.2-1b-instruct',
          name: 'Llama 3.2 1B Instruct',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.04,
          output_cost: 0.04,
          supports_vision: false,
          supports_function_calling: true
        },
        // Mistral Models
        {
          id: 'mistralai/mistral-large',
          name: 'Mistral Large',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 3.00,
          output_cost: 9.00,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'mistralai/mistral-medium',
          name: 'Mistral Medium',
          max_tokens: 4096,
          context_window: 32768,
          input_cost: 2.70,
          output_cost: 8.10,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'mistralai/mistral-small',
          name: 'Mistral Small',
          max_tokens: 4096,
          context_window: 32768,
          input_cost: 1.00,
          output_cost: 3.00,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'mistralai/mixtral-8x7b-instruct',
          name: 'Mixtral 8x7B Instruct',
          max_tokens: 4096,
          context_window: 32768,
          input_cost: 0.24,
          output_cost: 0.24,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'mistralai/mixtral-8x22b-instruct',
          name: 'Mixtral 8x22B Instruct',
          max_tokens: 4096,
          context_window: 65536,
          input_cost: 0.65,
          output_cost: 0.65,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'mistralai/codestral-latest',
          name: 'Codestral (Latest)',
          max_tokens: 4096,
          context_window: 32768,
          input_cost: 1.00,
          output_cost: 3.00,
          supports_vision: false,
          supports_function_calling: true
        },
        // Perplexity Models
        {
          id: 'perplexity/llama-3.1-sonar-large-128k-online',
          name: 'Llama 3.1 Sonar Large (Online)',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 1.00,
          output_cost: 1.00,
          supports_vision: false,
          supports_function_calling: false
        },
        {
          id: 'perplexity/llama-3.1-sonar-small-128k-online',
          name: 'Llama 3.1 Sonar Small (Online)',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.20,
          output_cost: 0.20,
          supports_vision: false,
          supports_function_calling: false
        },
        {
          id: 'perplexity/llama-3.1-sonar-large-128k-chat',
          name: 'Llama 3.1 Sonar Large (Chat)',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 1.00,
          output_cost: 1.00,
          supports_vision: false,
          supports_function_calling: false
        },
        {
          id: 'perplexity/llama-3.1-sonar-small-128k-chat',
          name: 'Llama 3.1 Sonar Small (Chat)',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.20,
          output_cost: 0.20,
          supports_vision: false,
          supports_function_calling: false
        },
        // Cohere Models
        {
          id: 'cohere/command-r-plus',
          name: 'Command R+',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 3.00,
          output_cost: 15.00,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'cohere/command-r',
          name: 'Command R',
          max_tokens: 4096,
          context_window: 128000,
          input_cost: 0.50,
          output_cost: 1.50,
          supports_vision: false,
          supports_function_calling: true
        },
        // DeepSeek Models
        {
          id: 'deepseek/deepseek-chat',
          name: 'DeepSeek Chat',
          max_tokens: 4096,
          context_window: 64000,
          input_cost: 0.14,
          output_cost: 0.28,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'deepseek/deepseek-coder',
          name: 'DeepSeek Coder',
          max_tokens: 4096,
          context_window: 64000,
          input_cost: 0.14,
          output_cost: 0.28,
          supports_vision: false,
          supports_function_calling: true
        },
        // Qwen Models
        {
          id: 'qwen/qwen-2-72b-instruct',
          name: 'Qwen 2 72B Instruct',
          max_tokens: 4096,
          context_window: 32768,
          input_cost: 0.90,
          output_cost: 0.90,
          supports_vision: false,
          supports_function_calling: true
        },
        {
          id: 'qwen/qwen-2-vl-72b-instruct',
          name: 'Qwen 2 VL 72B Instruct',
          max_tokens: 4096,
          context_window: 32768,
          input_cost: 0.90,
          output_cost: 0.90,
          supports_vision: true,
          supports_function_calling: true
        },
        // Nvidia Models
        {
          id: 'nvidia/nemotron-4-340b-instruct',
          name: 'Nemotron 4 340B Instruct',
          max_tokens: 4096,
          context_window: 4096,
          input_cost: 4.20,
          output_cost: 4.20,
          supports_vision: false,
          supports_function_calling: true
        },
        // X.AI Models
        {
          id: 'x-ai/grok-beta',
          name: 'Grok Beta',
          max_tokens: 4096,
          context_window: 131072,
          input_cost: 5.00,
          output_cost: 15.00,
          supports_vision: false,
          supports_function_calling: true
        }
      ];

      const models: AIModel[] = openrouterModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: 'openrouter' as const,
        description: `OpenRouter ${model.name} model`,
        max_tokens: model.max_tokens,
        supports_vision: model.supports_vision,
        supports_function_calling: model.supports_function_calling,
        cost_per_1k_input_tokens: model.input_cost,
        cost_per_1k_output_tokens: model.output_cost,
        context_window: model.context_window,
        created_at: now,
        updated_at: now
      }));

      logger.info(`Using ${models.length} default OpenRouter models`);
      return models;
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
        // Clear cache to force fresh fetch on manual sync
        this.clearOpenRouterCache();
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
      
      // Bulk upsert models
      const { added, updated } = await AIModelModel.bulkUpsert(models);
      
      // Deactivate models that are no longer available
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

  /**
   * Check if OpenAI model is a chat completion model
   */
  private isOpenAIChatModel(modelId: string): boolean {
    const chatModels = [
      'gpt-4', 'gpt-4-0314', 'gpt-4-0613', 'gpt-4-32k', 'gpt-4-32k-0314', 'gpt-4-32k-0613',
      'gpt-4-1106-preview', 'gpt-4-0125-preview', 'gpt-4-turbo-preview', 'gpt-4-turbo',
      'gpt-4-turbo-2024-04-09', 'gpt-4o', 'gpt-4o-2024-05-13', 'gpt-4o-2024-08-06',
      'gpt-4o-mini', 'gpt-4o-mini-2024-07-18',
      'gpt-3.5-turbo', 'gpt-3.5-turbo-0301', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-0125', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-16k-0613'
    ];
    
    return chatModels.some(model => modelId.startsWith(model));
  }

  /**
   * Get max tokens for OpenAI model
   */
  private getOpenAIMaxTokens(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 16384;
    if (modelId.includes('gpt-4-turbo')) return 4096;
    if (modelId.includes('gpt-4-32k')) return 32768;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo-16k')) return 16384;
    if (modelId.includes('gpt-3.5-turbo')) return 4096;
    return 4096; // default
  }

  /**
   * Get context window size for OpenAI model
   */
  private getOpenAIContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 128000;
    if (modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4-32k')) return 32768;
    if (modelId.includes('gpt-4-1106-preview')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo-16k')) return 16384;
    if (modelId.includes('gpt-3.5-turbo')) return 4096;
    return 4096; // default
  }

  /**
   * Check if model supports vision
   */
  private supportsVision(modelId: string): boolean {
    const visionModels = ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4o'];
    return visionModels.some(model => modelId.includes(model));
  }

  /**
   * Check if model supports function calling
   */
  private supportsFunctionCalling(modelId: string): boolean {
    const functionModels = [
      'gpt-4', 'gpt-4-0613', 'gpt-4-32k-0613', 'gpt-4-1106-preview', 'gpt-4-turbo',
      'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-1106'
    ];
    return functionModels.some(model => modelId.includes(model));
  }

  /**
   * Get input cost per 1K tokens for OpenAI model
   */
  private getOpenAIInputCost(modelId: string): number {
    if (modelId.includes('gpt-4o-mini')) return 0.15;
    if (modelId.includes('gpt-4o')) return 5.00;
    if (modelId.includes('gpt-4-turbo')) return 10.00;
    if (modelId.includes('gpt-4-32k')) return 60.00;
    if (modelId.includes('gpt-4')) return 30.00;
    if (modelId.includes('gpt-3.5-turbo')) return 0.50;
    return 0.50; // default
  }

  /**
   * Get output cost per 1K tokens for OpenAI model
   */
  private getOpenAIOutputCost(modelId: string): number {
    if (modelId.includes('gpt-4o-mini')) return 0.60;
    if (modelId.includes('gpt-4o')) return 15.00;
    if (modelId.includes('gpt-4-turbo')) return 30.00;
    if (modelId.includes('gpt-4-32k')) return 120.00;
    if (modelId.includes('gpt-4')) return 60.00;
    if (modelId.includes('gpt-3.5-turbo')) return 1.50;
    return 1.50; // default
  }

  /**
   * Format model name for display
   */
  private formatModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    };

    for (const [key, value] of Object.entries(nameMap)) {
      if (modelId.includes(key)) {
        return value;
      }
    }

    return modelId.toUpperCase();
  }

  /**
   * Get all available models from database
   */
  async getAvailableModels(): Promise<AIModel[]> {
    return await AIModelModel.findAll();
  }

  /**
   * Get models by provider from database
   */
  async getModelsByProvider(provider: 'openai' | 'anthropic' | 'openrouter'): Promise<AIModel[]> {
    return await AIModelModel.findByProvider(provider);
  }

  /**
   * Get a specific model by ID from database
   */
  async getModelById(id: string): Promise<AIModel | null> {
    return await AIModelModel.findById(id);
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<Record<string, { active: number; total: number }>> {
    return await AIModelModel.getProviderStats();
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Record<string, boolean> {
    return {
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      openrouter: !!this.openrouter
    };
  }

  /**
   * Clear OpenRouter models cache to force refresh on next fetch
   */
  clearOpenRouterCache(): void {
    this.openrouterModelsCache = null;
    logger.info('OpenRouter models cache cleared');
  }

  /**
   * Get cache status for OpenRouter models
   */
  getOpenRouterCacheStatus(): { cached: boolean; age?: number; count?: number } {
    if (!this.openrouterModelsCache) {
      return { cached: false };
    }
    const age = Date.now() - this.openrouterModelsCache.timestamp;
    return {
      cached: true,
      age: Math.round(age / 60000), // age in minutes
      count: this.openrouterModelsCache.models.length
    };
  }

  /**
   * Initialize model service - create tables and sync models
   */
  async initialize(): Promise<void> {
    try {
      // Create the models table
      await AIModelModel.createTable();
      logger.info('Model service initialized successfully');

      // Sync models from APIs
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
