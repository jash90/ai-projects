import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { ThreadModel, ThreadMessageModel } from '../models/Thread';
import { AgentModel } from '../models/Agent';
import { FileModel } from '../models/File';
import { TokenUsageModel } from '../models/TokenUsage';
import { aiService, ChatResponse } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, aiLimiter } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { createResourceNotFoundError, isAppError } from '../utils/errors';
import logger from '../utils/logger';

const router: Router = Router();

// ============================================
// THREAD ROUTES
// ============================================

/**
 * @swagger
 * /api/threads/projects/{projectId}:
 *   get:
 *     summary: Get all threads for a project
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of threads
 */
router.get('/projects/:projectId',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      projectId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const threads = await ThreadModel.findByProjectId(projectId, userId);

      res.json({
        success: true,
        data: { threads }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error fetching threads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch threads'
      });
    }
  }
);

/**
 * @swagger
 * /api/threads/projects/{projectId}:
 *   post:
 *     summary: Create a new thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/projects/:projectId',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      projectId: commonSchemas.uuid
    }),
    body: Joi.object({
      title: Joi.string().max(200).optional()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { title } = req.body;
      const userId = req.user!.id;

      const thread = await ThreadModel.create({
        project_id: projectId,
        title
      }, userId);

      logger.info('Thread created', { threadId: thread.id, projectId, userId });

      res.status(201).json({
        success: true,
        data: { thread }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error creating thread:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create thread'
      });
    }
  }
);

/**
 * @swagger
 * /api/threads/{threadId}:
 *   get:
 *     summary: Get thread by ID
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:threadId',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      threadId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const userId = req.user!.id;

      const thread = await ThreadModel.findById(threadId, userId);

      if (!thread) {
        return res.status(404).json({
          success: false,
          error: 'Thread not found'
        });
      }

      res.json({
        success: true,
        data: { thread }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error fetching thread:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch thread'
      });
    }
  }
);

/**
 * @swagger
 * /api/threads/{threadId}:
 *   put:
 *     summary: Update thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:threadId',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      threadId: commonSchemas.uuid
    }),
    body: Joi.object({
      title: Joi.string().max(200).required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const { title } = req.body;
      const userId = req.user!.id;

      const thread = await ThreadModel.update(threadId, { title }, userId);

      if (!thread) {
        return res.status(404).json({
          success: false,
          error: 'Thread not found'
        });
      }

      logger.info('Thread updated', { threadId, userId });

      res.json({
        success: true,
        data: { thread }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error updating thread:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update thread'
      });
    }
  }
);

/**
 * @swagger
 * /api/threads/{threadId}:
 *   delete:
 *     summary: Delete thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:threadId',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      threadId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const userId = req.user!.id;

      const deleted = await ThreadModel.delete(threadId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Thread not found'
        });
      }

      logger.info('Thread deleted', { threadId, userId });

      res.json({
        success: true,
        message: 'Thread deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error deleting thread:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete thread'
      });
    }
  }
);

/**
 * @swagger
 * /api/threads/{threadId}/stats:
 *   get:
 *     summary: Get token usage stats for a thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:threadId/stats',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      threadId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const userId = req.user!.id;

      const stats = await TokenUsageModel.getThreadStats(threadId, userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching thread stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch thread stats'
      });
    }
  }
);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * @swagger
 * /api/threads/{threadId}/messages:
 *   get:
 *     summary: Get all messages in a thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:threadId/messages',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      threadId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const userId = req.user!.id;

      const messages = await ThreadMessageModel.findByThreadId(threadId, userId);

      res.json({
        success: true,
        data: { messages }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages'
      });
    }
  }
);

/**
 * @swagger
 * /api/threads/{threadId}/chat:
 *   post:
 *     summary: Send a chat message in a thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:threadId/chat',
  aiLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      threadId: commonSchemas.uuid
    }),
    body: Joi.object({
      message: Joi.string().min(1).max(50000).required(),
      agentId: commonSchemas.uuid.required(),
      includeFiles: Joi.boolean().default(true),
      stream: Joi.boolean().default(false)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const { message, agentId, includeFiles, stream } = req.body;
      const userId = req.user!.id;

      // Get thread and verify access
      const thread = await ThreadModel.findById(threadId, userId);
      if (!thread) {
        throw createResourceNotFoundError('Thread', threadId);
      }

      // Get agent
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        throw createResourceNotFoundError('Agent', agentId);
      }

      // Save user message
      const userMessage = await ThreadMessageModel.create({
        thread_id: threadId,
        agent_id: null, // User messages don't have an agent
        role: 'user',
        content: message
      }, userId);

      // Auto-update thread title from first message if needed (with ownership check)
      await ThreadModel.updateTitleFromFirstMessage(threadId, userId);

      // Get recent messages for context
      const recentMessages = await ThreadMessageModel.getRecentMessages(threadId, userId, 20);

      // Format messages for AI
      const aiMessages = recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.created_at
      }));

      // Track warnings for partial failures
      const warnings: string[] = [];

      // Get project files for context if requested
      let projectFiles: string[] = [];
      if (includeFiles) {
        try {
          const files = await FileModel.findByProjectId(thread.project_id, userId);
          projectFiles = files.map(file =>
            `File: ${file.name} (${file.type})\n${file.content}`
          );
        } catch (error) {
          const errorMsg = 'Failed to load project files for context';
          logger.warn(errorMsg, {
            projectId: thread.project_id,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          warnings.push(errorMsg);
        }
      }

      // Get AI response
      const aiResponse = await aiService.chat({
        agent,
        messages: aiMessages,
        projectFiles,
        userId,
        projectId: thread.project_id,
        conversationId: threadId,
        stream
      });

      if (stream && 'stream' in aiResponse) {
        // Handle streaming response
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
              // Final response with metadata
              const finalResponse = chunk as ChatResponse;

              // Save assistant message
              const assistantMessage = await ThreadMessageModel.create({
                thread_id: threadId,
                agent_id: agentId,
                role: 'assistant',
                content: finalResponse.content,
                metadata: finalResponse.metadata
              }, userId);

              // Get updated messages
              const updatedMessages = await ThreadMessageModel.findByThreadId(threadId, userId);

              // Send final response
              res.write(`data: ${JSON.stringify({
                type: 'complete',
                message: assistantMessage,
                messages: updatedMessages,
                response: {
                  content: finalResponse.content,
                  metadata: finalResponse.metadata
                },
                warnings: warnings.length > 0 ? warnings : undefined
              })}\n\n`);

              logger.info('Streaming chat message processed', {
                threadId,
                agentId,
                userId,
                userMessageLength: message.length,
                aiResponseLength: finalResponse.content.length
              });
            }
          }
        } catch (error) {
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

        // Save assistant message
        const assistantMessage = await ThreadMessageModel.create({
          thread_id: threadId,
          agent_id: agentId,
          role: 'assistant',
          content: regularResponse.content,
          metadata: regularResponse.metadata
        }, userId);

        // Get updated messages
        const updatedMessages = await ThreadMessageModel.findByThreadId(threadId, userId);

        logger.info('Chat message processed', {
          threadId,
          agentId,
          userId,
          userMessageLength: message.length,
          aiResponseLength: regularResponse.content.length
        });

        res.json({
          success: true,
          data: {
            message: assistantMessage,
            messages: updatedMessages,
            response: {
              content: regularResponse.content,
              metadata: regularResponse.metadata
            },
            warnings: warnings.length > 0 ? warnings : undefined
          }
        });
      }
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('access denied')) {
          throw createResourceNotFoundError('Thread', req.params.threadId);
        }
      }

      throw error;
    }
  })
);

/**
 * @swagger
 * /api/threads/{threadId}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:threadId/messages/:messageId',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      threadId: commonSchemas.uuid,
      messageId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const userId = req.user!.id;

      const deleted = await ThreadMessageModel.delete(messageId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      logger.info('Message deleted', { messageId, userId });

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error deleting message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
    }
  }
);

export default router;
