import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
export class UsageController {
  constructor(private service: UsageService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current token usage' })
  async getCurrent(@CurrentUser('id') userId: string) {
    return this.service.getCurrentUsage(userId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get usage summary' })
  async getSummary(@CurrentUser('id') userId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.getUserSummary(userId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get detailed usage stats' })
  async getStats(@CurrentUser('id') userId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const stats = await this.service.getUserStats(userId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    return { stats };
  }

  @Get('projects/:projectId/usage')
  @ApiOperation({ summary: 'Get project usage' })
  async getProjectUsage(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser('id') userId: string) {
    const stats = await this.service.getProjectStats(projectId, userId);
    return { stats };
  }

  @Get('agents/:agentId/usage')
  @ApiOperation({ summary: 'Get agent usage' })
  async getAgentUsage(@Param('agentId', ParseUUIDPipe) agentId: string, @CurrentUser('id') userId: string) {
    const stats = await this.service.getAgentStats(agentId, userId);
    return { stats };
  }
}
