import {
  Controller,
  Get,
  Path,
  Post,
  Route,
  SuccessResponse,
  Response as TsoaResponse,
  Tags
} from 'tsoa';
import { modelService } from '../services/modelService';
import { ErrorResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface AIModel {
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

interface ProviderInfo {
  name: string;
  configured: boolean;
  active_models: number;
  total_models: number;
}

interface ModelSyncResult {
  provider: string;
  models_added: number;
  models_updated: number;
  models_removed: number;
  success: boolean;
  error?: string;
}

// ===== Success Response Types =====

interface GetModelsResponse {
  success: true;
  data: {
    models: AIModel[];
    count: number;
  };
}

interface GetProviderStatusResponse {
  success: true;
  data: {
    providers: ProviderInfo[];
  };
}

interface GetModelsByProviderResponse {
  success: true;
  data: {
    provider: string;
    models: AIModel[];
    count: number;
  };
}

interface GetModelByIdResponse {
  success: true;
  data: {
    model: AIModel;
  };
}

interface SyncModelsResponse {
  success: true;
  data: {
    results: ModelSyncResult[];
    total_added: number;
    total_updated: number;
    total_removed: number;
  };
}

/**
 * AI Models Management
 *
 * Endpoints for discovering available AI models, checking provider status,
 * and synchronizing models from OpenAI, Anthropic, and OpenRouter APIs.
 */
@Route('models')
@Tags('Models')
export class ModelsController extends Controller {
  /**
   * Get all available AI models
   *
   * Retrieves a list of all active AI models from all configured providers.
   * Models include metadata such as pricing, context window, and capabilities.
   * This endpoint is publicly accessible without authentication.
   *
   * @summary Get all AI models (public)
   * @example request Example request
   * GET /api/models
   */
  @Get()
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch models')
  public async getModels(): Promise<GetModelsResponse> {
    try {
      const models = await modelService.getAvailableModels();

      return {
        success: true,
        data: {
          models,
          count: models.length
        }
      };
    } catch (error) {
      logger.error('Failed to fetch models', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: 'no-request-context'
      });

      this.setStatus(500);
      throw new Error('Failed to fetch models');
    }
  }

  /**
   * Get provider status and statistics
   *
   * Returns configuration status and model counts for each AI provider
   * (OpenAI, Anthropic, OpenRouter). Shows which providers are configured
   * and how many models are available from each.
   * This endpoint is publicly accessible without authentication.
   *
   * @summary Get AI provider status (public)
   * @example request Example request
   * GET /api/models/providers/status
   */
  @Get('providers/status')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch provider status')
  public async getProviderStatus(): Promise<GetProviderStatusResponse> {
    try {
      const providerStatus = modelService.getProviderStatus();
      const providerStats = await modelService.getProviderStats();

      const providers: ProviderInfo[] = Object.keys(providerStatus).map(provider => ({
        name: provider,
        configured: providerStatus[provider],
        active_models: providerStats[provider]?.active || 0,
        total_models: providerStats[provider]?.total || 0
      }));

      return {
        success: true,
        data: {
          providers
        }
      };
    } catch (error) {
      logger.error('Failed to fetch provider status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: 'no-request-context'
      });

      this.setStatus(500);
      throw new Error('Failed to fetch provider status');
    }
  }

  /**
   * Get models by provider
   *
   * Retrieves all models from a specific AI provider (openai, anthropic, or openrouter).
   * This endpoint is publicly accessible without authentication.
   *
   * @summary Get models from specific provider (public)
   * @param provider Provider name (openai, anthropic, or openrouter)
   * @example request Example request
   * GET /api/models/providers/openai
   */
  @Get('providers/{provider}')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(400, 'Invalid provider')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch models')
  public async getModelsByProvider(
    @Path() provider: 'openai' | 'anthropic' | 'openrouter'
  ): Promise<GetModelsByProviderResponse> {
    try {
      const models = await modelService.getModelsByProvider(provider);

      return {
        success: true,
        data: {
          provider,
          models,
          count: models.length
        }
      };
    } catch (error) {
      logger.error('Failed to fetch models by provider', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider,
        correlationId: 'no-request-context'
      });

      this.setStatus(500);
      throw new Error(`Failed to fetch models for provider: ${provider}`);
    }
  }

  /**
   * Get model by ID
   *
   * Retrieves detailed information about a specific AI model by its ID.
   * This endpoint is publicly accessible without authentication.
   *
   * @summary Get specific model details (public)
   * @param modelId Model identifier (e.g., "gpt-4", "claude-3-opus")
   * @example request Example request
   * GET /api/models/gpt-4
   */
  @Get('{modelId}')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'Model not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch model')
  public async getModelById(
    @Path() modelId: string
  ): Promise<GetModelByIdResponse> {
    try {
      const model = await modelService.getModelById(modelId);

      if (!model) {
        this.setStatus(404);
        throw new Error('Model not found');
      }

      return {
        success: true,
        data: {
          model
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to fetch model by ID', {
        error: errorMessage,
        model_id: modelId,
        correlationId: 'no-request-context'
      });

      if (errorMessage === 'Model not found') {
        this.setStatus(404);
      } else {
        this.setStatus(500);
      }

      throw error;
    }
  }

  /**
   * Synchronize models from all providers
   *
   * Fetches the latest models from OpenAI, Anthropic, and OpenRouter APIs
   * and updates the database. This endpoint is publicly accessible to allow
   * automatic model list updates.
   *
   * @summary Sync models from all AI providers (public)
   * @example request Example request
   * POST /api/models/sync
   */
  @Post('sync')
  @SuccessResponse('200', 'Synced successfully')
  @TsoaResponse<ErrorResponse>(500, 'Sync failed')
  public async syncModels(): Promise<SyncModelsResponse> {
    try {
      const results = await modelService.syncAllModels();

      const total_added = results.reduce((sum, r) => sum + r.models_added, 0);
      const total_updated = results.reduce((sum, r) => sum + r.models_updated, 0);
      const total_removed = results.reduce((sum, r) => sum + r.models_removed, 0);

      logger.info('Models sync completed', {
        total_added,
        total_updated,
        total_removed,
        results,
        correlationId: 'no-request-context'
      });

      return {
        success: true,
        data: {
          results,
          total_added,
          total_updated,
          total_removed
        }
      };
    } catch (error) {
      logger.error('Failed to sync models', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: 'no-request-context'
      });

      this.setStatus(500);
      throw new Error('Failed to sync models');
    }
  }
}
