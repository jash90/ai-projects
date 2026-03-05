import { Controller, Get, Post, Delete, Param, Query, Res, ParseUUIDPipe, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import multer from 'multer';
import { UploadedFilesService } from './uploaded-files.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Uploaded Files')
@ApiBearerAuth()
@Controller('files')
export class UploadedFilesController {
  constructor(private service: UploadedFilesService) {}

  @Get('projects/:projectId/uploads')
  @ApiOperation({ summary: 'List uploaded files' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findByProjectId(projectId, userId, page || 1, limit || 20);
  }

  @Post('projects/:projectId/uploads')
  @Throttle({ default: { limit: 200, ttl: 3600000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: 52428800 } }))
  @ApiOperation({ summary: 'Upload file' })
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { file: await this.service.upload(projectId, userId, file) };
  }

  @Get('files/:id')
  @ApiOperation({ summary: 'Get uploaded file' })
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const { file, buffer } = await this.service.getFileBuffer(id, userId);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.send(buffer);
  }

  @Get('files/:id/download')
  @ApiOperation({ summary: 'Download uploaded file' })
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const { file, buffer } = await this.service.getFileBuffer(id, userId);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.send(buffer);
  }

  @Delete('files/:id')
  @ApiOperation({ summary: 'Delete uploaded file' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.delete(id, userId);
  }

  @Get('projects/:projectId/uploads/type/:mimetype')
  @ApiOperation({ summary: 'Get files by MIME type' })
  async getByMimetype(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('mimetype') mimetype: string,
    @CurrentUser('id') userId: string,
  ) {
    const files = await this.service.getFilesByMimetype(projectId, userId, mimetype);
    return { files, mimetype, count: files.length };
  }

  @Get('projects/:projectId/uploads/search')
  @ApiOperation({ summary: 'Search uploaded files' })
  async search(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Query('q') q: string,
    @Query('limit') limit?: number,
  ) {
    const files = await this.service.searchFiles(projectId, userId, q, limit || 20);
    return { files, query: q, results_count: files.length };
  }

  @Get('projects/:projectId/uploads/stats')
  @ApiOperation({ summary: 'Get uploaded files stats' })
  async getStats(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const stats = await this.service.getProjectStats(projectId, userId);
    return { project_id: projectId, ...stats };
  }

  @Post('files/:id/migrate-markdown')
  @ApiOperation({ summary: 'Migrate file to Markdown' })
  async migrateToMarkdown(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.migrateToMarkdown(id, userId);
  }
}
