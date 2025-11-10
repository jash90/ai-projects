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
 * @swagger
 * /api/models:
 *   get:
 *     summary: Get all available AI models
 *     tags: [Models]
 *     description: Retrieve a list of all available AI models from configured providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Models retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     models:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AIModel'
 *                     count:
 *                       type: number
 *                       description: Total number of available models
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 * @swagger
 * /api/models/providers/status:
 *   get:
 *     summary: Get provider status
 *     tags: [Models]
 *     description: Retrieve status and statistics for all AI providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     providers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProviderStatus'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 * @swagger
 * /api/models/providers/{provider}:
 *   get:
 *     summary: Get models by provider
 *     tags: [Models]
 *     description: Retrieve all models from a specific AI provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [openai, anthropic]
 *         description: AI provider name
 *     responses:
 *       200:
 *         description: Provider models retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                     models:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AIModel'
 *                     count:
 *                       type: number
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/providers/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (provider !== 'openai' && provider !== 'anthropic') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "openai" or "anthropic"'
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
 * @swagger
 * /api/models/{modelId}:
 *   get:
 *     summary: Get specific model details
 *     tags: [Models]
 *     description: Retrieve detailed information about a specific AI model
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Model ID (e.g., gpt-4, claude-3-sonnet)
 *     responses:
 *       200:
 *         description: Model details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     model:
 *                       $ref: '#/components/schemas/AIModel'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 * @swagger
 * /api/models/sync:
 *   post:
 *     summary: Sync models from AI providers
 *     tags: [Models]
 *     description: Manually trigger synchronization of models from all configured AI providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Models synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
