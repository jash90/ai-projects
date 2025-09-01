import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import config from '../utils/config';
import logger from '../utils/logger';
import { AIModelModel } from '../models/AIModel';

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
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
  provider: 'openai' | 'anthropic';
  models_added: number;
  models_updated: number;
  models_removed: number;
  success: boolean;
  error?: string;
}

class ModelService {
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

      // Custom Anthropic models list
      const anthropicModels = [
        {
          id: 'claude-opus-4-1-20250805',
          name: 'Claude Opus 4.1',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 20.00,
          output_cost: 80.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'claude-opus-4-20250514',
          name: 'Claude Opus 4',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 18.00,
          output_cost: 75.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'claude-sonnet-4-20250514',
          name: 'Claude Sonnet 4',
          max_tokens: 8192,
          context_window: 200000,
          input_cost: 8.00,
          output_cost: 25.00,
          supports_vision: true,
          supports_function_calling: true
        },
        {
          id: 'claude-3-7-sonnet-latest',
          name: 'Claude 3.7 Sonnet Latest',
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

    return results;
  }

  /**
   * Sync models to database
   */
  private async syncModelsToDatabase(provider: 'openai' | 'anthropic', models: AIModel[]): Promise<ModelSyncResult> {
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
  async getModelsByProvider(provider: 'openai' | 'anthropic'): Promise<AIModel[]> {
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
      anthropic: !!this.anthropic
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
