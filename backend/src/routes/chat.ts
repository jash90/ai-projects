import { Router, Request, Response } from 'express';
import Joi from 'joi';
import multer from 'multer';
import { AgentModel } from '../models/Agent';
import { ConversationModel } from '../models/Conversation';
import { FileModel } from '../models/File';
import { aiService, ChatResponse } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { aiLimiter, generalLimiter } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { createResourceNotFoundError, isAppError, createValidationError } from '../utils/errors';
import logger from '../utils/logger';
import {
  ChatFileAttachment,
  SUPPORTED_CHAT_FILE_TYPES,
  MAX_CHAT_FILE_SIZE,
  MAX_CHAT_FILES_COUNT
} from '../types';

// Configure multer for chat file uploads
const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CHAT_FILE_SIZE,
    files: MAX_CHAT_FILES_COUNT,
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_CHAT_FILE_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: ${SUPPORTED_CHAT_FILE_TYPES.join(', ')}`));
    }
  },
});

const router: Router = Router();

/**
 * @swagger
 * /api/chat/projects/{projectId}/agents/{agentId}/chat:
 *   post:
 *     summary: Send message to AI agent
 *     tags: [Chat]
 *     description: Send a chat message to an AI agent and receive a response (streaming or regular). Supports file attachments (images, PDFs).
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50000
 *                 description: User message to send to AI
 *               includeFiles:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 default: 'true'
 *                 description: Include project files in context
 *               stream:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 default: 'false'
 *                 description: Enable streaming response
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: File attachments (images, PDFs - max 5 files, 20MB each)
 *             required:
 *               - message
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
  // Handle both multipart/form-data (with files) and application/json
  (req: Request, res: Response, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      chatUpload.array('files', MAX_CHAT_FILES_COUNT)(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                error: `File too large. Maximum size is ${MAX_CHAT_FILE_SIZE / 1024 / 1024}MB`
              });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return res.status(400).json({
                success: false,
                error: `Too many files. Maximum is ${MAX_CHAT_FILES_COUNT} files`
              });
            }
          }
          return res.status(400).json({
            success: false,
            error: err.message
          });
        }
        next();
      });
    } else {
      next();
    }
  },
  validate({
    params: Joi.object({
      projectId: commonSchemas.uuid,
      agentId: commonSchemas.uuid
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { projectId, agentId } = req.params;
      const userId = req.user!.id;

      // Handle both JSON and form-data
      let message: string;
      let includeFiles: boolean;
      let stream: boolean;

      if (req.is('multipart/form-data')) {
        message = req.body.message;
        includeFiles = req.body.includeFiles !== 'false';
        stream = req.body.stream === 'true';
      } else {
        message = req.body.message;
        includeFiles = req.body.includeFiles !== false;
        stream = req.body.stream === true;
      }

      // Validate message
      if (!message || message.length < 1 || message.length > 50000) {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be between 1 and 50000 characters'
        });
      }

      // Process file attachments
      const attachments: ChatFileAttachment[] = [];
      const uploadedFiles = req.files as Express.Multer.File[] | undefined;

      if (uploadedFiles && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          attachments.push({
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            data: file.buffer.toString('base64')
          });
        }

        logger.info('Chat message with file attachments', {
          projectId,
          agentId,
          userId,
          fileCount: attachments.length,
          fileTypes: attachments.map(f => f.mimetype),
          totalSize: attachments.reduce((sum, f) => sum + f.size, 0)
        });
      }

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

      // Add user message with attachment metadata
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date(),
        metadata: attachments.length > 0 ? {
          attachments: attachments.map(a => ({
            filename: a.filename,
            mimetype: a.mimetype,
            size: a.size
          }))
        } : undefined
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
        attachments: attachments.length > 0 ? attachments : undefined,
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
                fileCount: projectFiles.length,
                attachmentCount: attachments.length
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
          fileCount: projectFiles.length,
          attachmentCount: attachments.length
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
      if (isAppError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('access denied')) {
          throw createResourceNotFoundError('Project', req.params.projectId);
        }
      }

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
      provider: Joi.string().valid('openai', 'anthropic', 'openrouter').required(),
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
