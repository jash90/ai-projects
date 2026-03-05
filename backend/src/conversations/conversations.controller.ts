import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project conversations' })
  async getProjectConversations(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const conversations = await this.conversationsService.getProjectConversations(projectId, userId);
    return { conversations };
  }

  @Post()
  @ApiOperation({ summary: 'Create or update conversation' })
  async createOrUpdate(
    @Body() dto: CreateConversationDto,
    @CurrentUser('id') userId: string,
  ) {
    const conversation = await this.conversationsService.createOrUpdate(dto.projectId, dto.agentId, dto.messages || [], userId);
    return { conversation };
  }

  @Delete(':projectId/:agentId')
  @ApiOperation({ summary: 'Clear conversation' })
  async clear(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.conversationsService.clear(projectId, agentId, userId);
  }
}
