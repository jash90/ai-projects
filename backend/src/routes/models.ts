import { Router } from 'express';
import { modelService } from '../services/modelService';
import { authenticateToken } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router: Router = Router();

// Apply auth and rate limiting to all model routes
router.use(authenticateToken);
router.use(generalLimiter);

/**
 * GET /api/models
 * Get all available AI models
 */
router.get('/', async (req, res) => {
  try {
    const models = await modelService.getAvailableModels();
    
    res.json({
      success: true,
      data: {
        models,
        count: models.length
      }
    });
  } catch (error) {
    logger.error('Failed to fetch models', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models'
    });
  }
});

/**
 * GET /api/models/providers/status
 * Get provider status and statistics
 */
router.get('/providers/status', async (req, res) => {
  try {
    const providerStatus = modelService.getProviderStatus();
    const providerStats = await modelService.getProviderStats();
    
    res.json({
      success: true,
      data: {
        providers: Object.keys(providerStatus).map(provider => ({
          name: provider,
          configured: providerStatus[provider],
          active_models: providerStats[provider]?.active || 0,
          total_models: providerStats[provider]?.total || 0
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch provider status', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider status'
    });
  }
});

/**
 * GET /api/models/providers/:provider
 * Get models by provider (openai or anthropic)
 */
router.get('/providers/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (provider !== 'openai' && provider !== 'anthropic' && provider !== 'openrouter') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "openai", "anthropic", or "openrouter"'
      });
    }
    
    const models = await modelService.getModelsByProvider(provider);
    
    res.json({
      success: true,
      data: {
        provider,
        models,
        count: models.length
      }
    });
  } catch (error) {
    logger.error('Failed to fetch models by provider', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: req.params.provider,
      user_id: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models'
    });
  }
});

/**
 * GET /api/models/:modelId
 * Get a specific model by ID
 */
router.get('/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const model = await modelService.getModelById(modelId);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    res.json({
      success: true,
      data: { model }
    });
  } catch (error) {
    logger.error('Failed to fetch model', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      model_id: req.params.modelId,
      user_id: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model'
    });
  }
});

/**
 * POST /api/models/sync
 * Manually sync models from AI providers
 * Note: This is an admin-only operation in production
 */
router.post('/sync', async (req, res) => {
  try {
    logger.info('Manual model sync initiated', { user_id: req.user?.id });
    
    const results = await modelService.syncAllModels();
    
    const totalAdded = results.reduce((sum, r) => sum + r.models_added, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.models_updated, 0);
    const totalRemoved = results.reduce((sum, r) => sum + r.models_removed, 0);
    const allSuccessful = results.every(r => r.success);
    
    logger.info('Model sync completed', {
      user_id: req.user?.id,
      total_added: totalAdded,
      total_updated: totalUpdated,
      total_removed: totalRemoved,
      success: allSuccessful
    });
    
    res.json({
      success: allSuccessful,
      data: {
        results,
        summary: {
          total_added: totalAdded,
          total_updated: totalUpdated,
          total_removed: totalRemoved
        }
      }
    });
  } catch (error) {
    logger.error('Failed to sync models', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      user_id: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to sync models'
    });
  }
});

export default router;
