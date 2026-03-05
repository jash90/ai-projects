import { Controller, Post, Get, Body, Param, Res, ParseUUIDPipe, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import multer from 'multer';
import { ChatService } from './chat.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatResponse } from '../services/aiService';
import { isAppError } from '../utils/errors';
import { ChatFileAttachment, SUPPORTED_CHAT_FILE_TYPES, MAX_CHAT_FILE_SIZE, MAX_CHAT_FILES_COUNT } from '../types';
import logger from '../utils/logger';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('projects/:projectId/agents/:agentId/chat')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FilesInterceptor('files', MAX_CHAT_FILES_COUNT, {
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_CHAT_FILE_SIZE },
  }))
  @ApiOperation({ summary: 'Send message to AI agent' })
  async chat(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const message = body.message;
    const includeFiles = body.includeFiles !== false && body.includeFiles !== 'false';
    const stream = body.stream === true || body.stream === 'true';

    const attachments: ChatFileAttachment[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        attachments.push({
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
        });
      }
    }

    const result = await this.chatService.chat({
      projectId, agentId, userId, message, includeFiles, stream, attachments,
    });

    if (stream && 'stream' in result.aiResponse) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      try {
        for await (const chunk of result.aiResponse.stream) {
          if (typeof chunk === 'string') {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          } else {
            const finalResponse = chunk as ChatResponse;
            const assistantMessage = { role: 'assistant' as const, content: finalResponse.content, timestamp: new Date(), metadata: finalResponse.metadata };
            result.messages.push(assistantMessage);
            const updatedConversation = await this.chatService.saveConversation(projectId, agentId, result.messages, userId);
            res.write(`data: ${JSON.stringify({ type: 'complete', conversation: updatedConversation, response: { content: finalResponse.content, metadata: finalResponse.metadata } })}\n\n`);
          }
        }
      } catch (error) {
        const errorMessage = isAppError(error) ? error.userMessage : error instanceof Error ? error.message : 'Unknown error';
        res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
      } finally {
        res.end();
      }
    } else {
      const regularResponse = result.aiResponse as ChatResponse;
      const assistantMessage = { role: 'assistant' as const, content: regularResponse.content, timestamp: new Date(), metadata: regularResponse.metadata };
      result.messages.push(assistantMessage);
      const updatedConversation = await this.chatService.saveConversation(projectId, agentId, result.messages, userId);
      res.json({ success: true, data: { conversation: updatedConversation, response: { content: regularResponse.content, metadata: regularResponse.metadata } } });
    }
  }

  @Get('ai/status')
  @ApiOperation({ summary: 'Get AI service status' })
  async getStatus() {
    return { providers: this.chatService.getProviderStatus(), models: this.chatService.getAvailableModels() };
  }

  @Post('ai/validate')
  @ApiOperation({ summary: 'Validate AI configuration' })
  async validate(@Body() body: { provider: string; model: string }) {
    const providerStatus = this.chatService.getProviderStatus();
    if (!providerStatus[body.provider]) {
      return { success: false, error: `${body.provider} API key not configured` };
    }
    const available = this.chatService.isModelAvailable(body.provider, body.model);
    if (!available) {
      return { success: false, error: `Model ${body.model} not available for provider ${body.provider}` };
    }
    return { provider: body.provider, model: body.model, valid: true };
  }
}
