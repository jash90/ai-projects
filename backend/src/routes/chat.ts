import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AgentModel } from '../models/Agent';
import { ConversationModel } from '../models/Conversation';
import { FileModel } from '../models/File';
import { aiService } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router = Router();

// Send message to AI agent
router.post('/projects/:projectId/agents/:agentId/chat', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      agentId: commonSchemas.uuid
    }),
    body: Joi.object({
      message: Joi.string().min(1).max(50000).required(),
      includeFiles: Joi.boolean().default(true)
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId, agentId } = req.params;
      const { message, includeFiles } = req.body;
      const userId = req.user!.id;

      // Get agent
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
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

      // Get AI response
      const aiResponse = await aiService.chat({
        agent,
        messages,
        projectFiles,
        userId,
        projectId,
        conversationId: conversation?.id
      });

      // Add assistant message
      const assistantMessage = {
        role: 'assistant' as const,
        content: aiResponse.content,
        timestamp: new Date(),
        metadata: aiResponse.metadata
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
        aiResponseLength: aiResponse.content.length,
        totalMessages: messages.length,
        includeFiles,
        fileCount: projectFiles.length
      });

      res.json({
        success: true,
        data: {
          conversation: updatedConversation,
          response: {
            content: aiResponse.content,
            metadata: aiResponse.metadata
          }
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      if (error instanceof Error && (
        error.message.includes('API key not configured') ||
        error.message.includes('Unsupported AI provider')
      )) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      logger.error('Error processing chat message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message'
      });
    }
  }
);

// Get AI models and provider status
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

// Validate agent configuration
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
