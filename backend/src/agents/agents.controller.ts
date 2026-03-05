import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all agents' })
  async findAll() {
    const agents = await this.agentsService.findAll();
    return { agents };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const agent = await this.agentsService.findById(id);
    return { agent };
  }

  @Post()
  @Throttle({ default: { limit: 100, ttl: 3600000 } })
  @ApiOperation({ summary: 'Create agent' })
  async create(@Body() dto: CreateAgentDto) {
    const agent = await this.agentsService.create(dto);
    return { agent };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    const agent = await this.agentsService.update(id, dto);
    return { agent };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.delete(id);
  }
}
