import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProjectFilesService } from './project-files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Project Files')
@ApiBearerAuth()
@Controller()
export class ProjectFilesController {
  constructor(private service: ProjectFilesService) {}

  @Get('projects/:projectId/files')
  @ApiOperation({ summary: 'List project files' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const files = await this.service.findByProjectId(projectId, userId);
    return { files, count: files.length };
  }

  @Post('projects/:projectId/files')
  @Throttle({ default: { limit: 100, ttl: 3600000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create project file' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateFileDto,
    @CurrentUser('id') userId: string,
  ) {
    const file = await this.service.create(projectId, dto, userId);
    return { file };
  }

  @Get('files/:id')
  @ApiOperation({ summary: 'Get file by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const file = await this.service.findById(id, userId);
    return { file };
  }

  @Put('files/:id')
  @ApiOperation({ summary: 'Update file' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFileDto,
    @CurrentUser('id') userId: string,
  ) {
    const file = await this.service.update(id, dto, userId);
    return { file };
  }

  @Delete('files/:id')
  @ApiOperation({ summary: 'Delete file' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.delete(id, userId);
  }

  @Get('projects/:projectId/files/search')
  @ApiOperation({ summary: 'Search project files' })
  async search(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('q') q: string,
    @CurrentUser('id') userId: string,
  ) {
    const files = await this.service.searchFiles(projectId, q, userId);
    return { files, query: q, count: files.length };
  }

  @Get('projects/:projectId/files/type/:type')
  @ApiOperation({ summary: 'Get files by type' })
  async getByType(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('type') type: string,
    @CurrentUser('id') userId: string,
  ) {
    const files = await this.service.getFilesByType(projectId, type, userId);
    return { files, type, count: files.length };
  }

  @Get('projects/:projectId/files/stats')
  @ApiOperation({ summary: 'Get file stats' })
  async getStats(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const stats = await this.service.getProjectFileStats(projectId, userId);
    return { project_id: projectId, ...stats };
  }
}
