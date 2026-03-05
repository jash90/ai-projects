import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { FileModel } from '../models/File';

@Injectable()
export class ProjectFilesService {
  async findByProjectId(projectId: string, userId: string) {
    try {
      return await FileModel.findByProjectId(projectId, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async findById(id: string, userId: string) {
    const file = await FileModel.findById(id, userId);
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async create(projectId: string, data: { name: string; content?: string; type: string }, userId: string) {
    try {
      const existing = await FileModel.findByName(projectId, data.name, userId);
      if (existing) throw new ConflictException('File with this name already exists');
      return await FileModel.create(projectId, { ...data, content: data.content ?? '' }, userId);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async update(id: string, data: { name?: string; content?: string; type?: string }, userId: string) {
    try {
      if (data.name) {
        const existing = await FileModel.findById(id, userId);
        if (!existing) throw new NotFoundException('File not found');
        if (data.name !== existing.name) {
          const conflict = await FileModel.findByName(existing.project_id, data.name, userId);
          if (conflict) throw new ConflictException('File with this name already exists');
        }
      }
      const file = await FileModel.updateById(id, data, userId);
      if (!file) throw new NotFoundException('File not found');
      return file;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof ForbiddenException) throw error;
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied');
      }
      throw error;
    }
  }

  async delete(id: string, userId: string) {
    const deleted = await FileModel.deleteById(id, userId);
    if (!deleted) throw new NotFoundException('File not found');
    return { message: 'File deleted successfully' };
  }

  async searchFiles(projectId: string, query: string, userId: string) {
    try {
      return await FileModel.searchFiles(projectId, query, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async getFilesByType(projectId: string, type: string, userId: string) {
    try {
      return await FileModel.getFilesByType(projectId, type, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }

  async getProjectFileStats(projectId: string, userId: string) {
    try {
      return await FileModel.getProjectFileStats(projectId, userId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        throw new ForbiddenException('Access denied to this project');
      }
      throw error;
    }
  }
}
