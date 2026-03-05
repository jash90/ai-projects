import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ThreadsService } from './threads.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThreadMessageModel } from '../models/Thread';
import { ChatResponse } from '../services/aiService';
import { isAppError } from '../utils/errors';
import logger from '../utils/logger';

@ApiTags('Threads')
@ApiBearerAuth()
@Controller('threads')
export class ThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'List project threads' })
  async findByProject(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser('id') userId: string) {
    const threads = await this.threadsService.findByProjectId(projectId, userId);
    return { threads };
  }

  @Post('projects/:projectId')
  @ApiOperation({ summary: 'Create thread' })
  async create(@Param('projectId', ParseUUIDPipe) projectId: string, @Body() body: { title?: string }, @CurrentUser('id') userId: string) {
    const thread = await this.threadsService.create(projectId, body.title, userId);
    return { thread };
  }

  @Get(':threadId')
  @ApiOperation({ summary: 'Get thread' })
  async findOne(@Param('threadId', ParseUUIDPipe) threadId: string, @CurrentUser('id') userId: string) {
    const thread = await this.threadsService.findById(threadId, userId);
    return { thread };
  }

  @Put(':threadId')
  @ApiOperation({ summary: 'Update thread' })
  async update(@Param('threadId', ParseUUIDPipe) threadId: string, @Body() body: { title: string }, @CurrentUser('id') userId: string) {
    const thread = await this.threadsService.update(threadId, body.title, userId);
    return { thread };
  }

  @Delete(':threadId')
  @ApiOperation({ summary: 'Delete thread' })
  async delete(@Param('threadId', ParseUUIDPipe) threadId: string, @CurrentUser('id') userId: string) {
    return this.threadsService.delete(threadId, userId);
  }

  @Get(':threadId/stats')
  @ApiOperation({ summary: 'Get thread stats' })
  async getStats(@Param('threadId', ParseUUIDPipe) threadId: string, @CurrentUser('id') userId: string) {
    return this.threadsService.getThreadStats(threadId, userId);
  }

  @Get(':threadId/messages')
  @ApiOperation({ summary: 'List thread messages' })
  async getMessages(@Param('threadId', ParseUUIDPipe) threadId: string, @CurrentUser('id') userId: string) {
    const messages = await this.threadsService.getMessages(threadId, userId);
    return { messages };
  }

  @Post(':threadId/chat')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Send chat message in thread' })
  async chat(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Body() body: { message: string; agentId: string; includeFiles?: boolean; stream?: boolean },
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const result = await this.threadsService.chat({
      threadId, agentId: body.agentId, userId, message: body.message,
      includeFiles: body.includeFiles !== false, stream: body.stream === true,
    });

    if (body.stream && 'stream' in result.aiResponse) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });

      try {
        for await (const chunk of result.aiResponse.stream) {
          if (typeof chunk === 'string') {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          } else {
            const finalResponse = chunk as ChatResponse;
            const assistantMessage = await this.threadsService.saveAssistantMessage(threadId, result.agentId, finalResponse.content, finalResponse.metadata, userId);
            const updatedMessages = await ThreadMessageModel.findByThreadId(threadId, userId);
            res.write(`data: ${JSON.stringify({ type: 'complete', message: assistantMessage, messages: updatedMessages, response: { content: finalResponse.content, metadata: finalResponse.metadata }, warnings: result.warnings.length > 0 ? result.warnings : undefined })}\n\n`);
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
      const assistantMessage = await this.threadsService.saveAssistantMessage(threadId, result.agentId, regularResponse.content, regularResponse.metadata, userId);
      const updatedMessages = await ThreadMessageModel.findByThreadId(threadId, userId);
      res.json({ success: true, data: { message: assistantMessage, messages: updatedMessages, response: { content: regularResponse.content, metadata: regularResponse.metadata }, warnings: result.warnings.length > 0 ? result.warnings : undefined } });
    }
  }

  @Delete(':threadId/messages/:messageId')
  @ApiOperation({ summary: 'Delete message' })
  async deleteMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @CurrentUser('id') userId: string) {
    return this.threadsService.deleteMessage(messageId, userId);
  }
}
