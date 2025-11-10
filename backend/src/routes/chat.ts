import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AgentModel } from '../models/Agent';
import { ConversationModel } from '../models/Conversation';
import { FileModel } from '../models/File';
import { aiService, ChatResponse } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { aiLimiter, generalLimiter } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { createResourceNotFoundError, createAIServiceError, isAppError } from '../utils/errors';
import logger from '../utils/logger';

const router: Router = Router();

/**
 * @swagger
 * /api/chat/projects/{projectId}/agents/{agentId}/chat:
 *   post:
 *     summary: Send message to AI agent
 *     tags: [Chat]
 *     description: Send a chat message to an AI agent and receive a response (streaming or regular)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50000
 *                 description: User message to send to AI
 *               includeFiles:
 *                 type: boolean
 *                 default: true
 *                 description: Include project files in context
 *               stream:
 *                 type: boolean
 *                 default: false
 *                 description: Enable streaming response
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: Chat response received successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-sent events stream (when stream=true)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       402:
 *         description: Token limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/projects/:projectId/agents/:agentId/chat', 
  aiLimiter, // Use AI-specific rate limiting
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      agentId: commonSchemas.uuid
    }),
    body: Joi.object({
      message: Joi.string().min(1).max(50000).required(),
      includeFiles: Joi.boolean().default(true),
      stream: Joi.boolean().default(false)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { projectId, agentId } = req.params;
      const { message, includeFiles, stream } = req.body;
      const userId = req.user!.id;

      // Get agent
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        throw createResourceNotFoundError('Agent', agentId);
      }

      // Get existing conversation
      const conversation = await ConversationModel.findByProjectAndAgent(
        projectId, 
        agentId, 
        userId
      );

      const messages = conversation ? conversation.messages : [];

      // Add user message
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      };

      messages.push(userMessage);

      // Get project files for context if requested
      let projectFiles: string[] = [];
      if (includeFiles) {
        try {
          const files = await FileModel.findByProjectId(projectId, userId);
          projectFiles = files.map(file => 
            `File: ${file.name} (${file.type})\n${file.content}`
          );
        } catch (error) {
          logger.warn('Failed to load project files for context', { 
            projectId, 
            userId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Get AI response (streaming or regular)
      const aiResponse = await aiService.chat({
        agent,
        messages,
        projectFiles,
        userId,
        projectId,
        conversationId: conversation?.id,
        stream
      });

      if (stream && 'stream' in aiResponse) {
        // Handle streaming response
        // CORS headers are handled by global middleware
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        let fullContent = '';
        
        try {
          for await (const chunk of aiResponse.stream) {
            if (typeof chunk === 'string') {
              fullContent += chunk;
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
            } else {
              // This is the final response with metadata
              const finalResponse = chunk as ChatResponse;
              
              // Add assistant message
              const assistantMessage = {
                role: 'assistant' as const,
                content: finalResponse.content,
                timestamp: new Date(),
                metadata: finalResponse.metadata
              };

              messages.push(assistantMessage);

              // Save updated conversation
              const updatedConversation = await ConversationModel.createOrUpdate(
                projectId,
                agentId,
                messages,
                userId
              );

              // Send final response
              res.write(`data: ${JSON.stringify({ 
                type: 'complete', 
                conversation: updatedConversation,
                response: {
                  content: finalResponse.content,
                  metadata: finalResponse.metadata
                }
              })}\n\n`);

              logger.info('Streaming chat message processed', {
                projectId,
                agentId,
                userId,
                userMessageLength: message.length,
                aiResponseLength: finalResponse.content.length,
                totalMessages: messages.length,
                includeFiles,
                fileCount: projectFiles.length
              });
            }
          }
        } catch (error) {
          // Handle streaming errors with proper error formatting
          let errorMessage = 'Unknown error';
          if (isAppError(error)) {
            errorMessage = error.userMessage;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }
          res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
        } finally {
          res.end();
        }
      } else {
        // Handle regular response
        const regularResponse = aiResponse as ChatResponse;
        
        // Add assistant message
        const assistantMessage = {
          role: 'assistant' as const,
          content: regularResponse.content,
          timestamp: new Date(),
          metadata: regularResponse.metadata
        };

        messages.push(assistantMessage);

        // Save updated conversation
        const updatedConversation = await ConversationModel.createOrUpdate(
          projectId,
          agentId,
          messages,
          userId
        );

        logger.info('Chat message processed', {
          projectId,
          agentId,
          userId,
          userMessageLength: message.length,
          aiResponseLength: regularResponse.content.length,
          totalMessages: messages.length,
          includeFiles,
          fileCount: projectFiles.length
        });

        res.json({
          success: true,
          data: {
            conversation: updatedConversation,
            response: {
              content: regularResponse.content,
              metadata: regularResponse.metadata
            }
          }
        });
      }
    } catch (error) {
      // Let the async handler deal with AppErrors
      if (isAppError(error)) {
        throw error;
      }

      // Handle specific error types and convert to AppErrors
      if (error instanceof Error) {
        if (error.message.includes('access denied')) {
          throw createResourceNotFoundError('Project', req.params.projectId);
        }

        if (error.message.includes('API key not configured') || 
            error.message.includes('Unsupported AI provider')) {
          throw createAIServiceError('unknown', error.message);
        }
      }

      // Re-throw unknown errors to be handled by global error handler
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/chat/ai/status:
 *   get:
 *     summary: Get AI service status
 *     tags: [Chat]
 *     description: Retrieve AI provider availability and available models
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI status retrieved successfully
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
 *                       type: object
 *                       properties:
 *                         openai:
 *                           type: boolean
 *                         anthropic:
 *                           type: boolean
 *                       description: Provider availability status
 *                     models:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AIModel'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/ai/status', 
  generalLimiter,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const providerStatus = aiService.getProviderStatus();
      const availableModels = aiService.getAvailableModels();

      res.json({
        success: true,
        data: {
          providers: providerStatus,
          models: availableModels
        }
      });
    } catch (error) {
      logger.error('Error fetching AI status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI status'
      });
    }
  }
);

/**
 * @swagger
 * /api/chat/ai/validate:
 *   post:
 *     summary: Validate AI configuration
 *     tags: [Chat]
 *     description: Validate that a specific AI provider and model combination is available
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatValidationRequest'
 *     responses:
 *       200:
 *         description: Configuration validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatValidationResponse'
 *       400:
 *         description: Invalid configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/ai/validate', 
  generalLimiter,
  authenticateToken,
  validate({ 
    body: Joi.object({
      provider: Joi.string().valid('openai', 'anthropic').required(),
      model: Joi.string().required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { provider, model } = req.body;

      const providerStatus = aiService.getProviderStatus();
      if (!providerStatus[provider]) {
        return res.status(400).json({
          success: false,
          error: `${provider} API key not configured`
        });
      }

      const isModelAvailable = aiService.isModelAvailable(provider, model);
      if (!isModelAvailable) {
        return res.status(400).json({
          success: false,
          error: `Model ${model} not available for provider ${provider}`
        });
      }

      res.json({
        success: true,
        data: {
          provider,
          model,
          valid: true
        }
      });
    } catch (error) {
      logger.error('Error validating AI configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate configuration'
      });
    }
  }
);

export default router;
