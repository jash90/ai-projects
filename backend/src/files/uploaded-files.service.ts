import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectFileModel } from '../models/ProjectFile';
import { ProjectModel } from '../models/Project';
import { FileModel } from '../models/File';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

@Injectable()
export class UploadedFilesService {
  constructor(private configService: ConfigService) {}

  private get uploadPath() {
    return this.configService.get<string>('app.uploadPath', '/tmp/uploads');
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  async findByProjectId(projectId: string, userId: string, page = 1, limit = 20) {
    try {
      return await ProjectFileModel.findByProjectId(projectId, userId, page, limit);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async findById(id: string, userId: string) {
    const file = await ProjectFileModel.findById(id, userId);
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async upload(projectId: string, userId: string, uploadedFile: Express.Multer.File) {
    const project = await ProjectModel.findById(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    await this.ensureUploadDir();

    const fileExtension = path.extname(uploadedFile.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const filepath = path.join(this.uploadPath, filename);

    await fs.writeFile(filepath, uploadedFile.buffer);

    const file = await ProjectFileModel.create({
      project_id: projectId,
      filename,
      original_name: uploadedFile.originalname,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.buffer.length,
      path: filepath,
      uploaded_by: userId,
    });

    logger.info('File uploaded', { fileId: file.id, projectId, userId, filename: file.original_name, size: file.size });

    return { ...file, path: undefined };
  }

  async getFileBuffer(id: string, userId: string) {
    const file = await this.findById(id, userId);
    try {
      await fs.access(file.path);
    } catch {
      throw new NotFoundException('File not found on disk');
    }
    const buffer = await fs.readFile(file.path);
    return { file, buffer };
  }

  async delete(id: string, userId: string) {
    const filePath = await ProjectFileModel.getFilePath(id, userId);
    if (!filePath) throw new NotFoundException('File not found');

    const deleted = await ProjectFileModel.deleteById(id, userId);
    if (!deleted) throw new NotFoundException('File not found');

    try { await fs.unlink(filePath); } catch { logger.warn('File not found on disk during deletion', { fileId: id }); }
    return { message: 'File deleted successfully' };
  }

  async getFilesByMimetype(projectId: string, userId: string, mimetype: string) {
    try {
      return await ProjectFileModel.getFilesByMimetype(projectId, userId, mimetype);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async searchFiles(projectId: string, userId: string, query: string, limit = 20) {
    try {
      return await ProjectFileModel.searchFiles(projectId, userId, query, limit);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async getProjectStats(projectId: string, userId: string) {
    try {
      return await ProjectFileModel.getProjectStats(projectId, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async migrateToMarkdown(id: string, userId: string) {
    const file = await FileModel.findById(id, userId);
    if (!file) throw new NotFoundException('File not found');
    await FileModel.updateById(id, { type: 'markdown' }, userId);
    return { message: 'File migrated to Markdown successfully' };
  }
}
