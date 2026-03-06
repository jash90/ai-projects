import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectModel } from '../models/Project';

@Injectable()
export class ProjectsService {
  async findByUserId(userId: string, page = 1, limit = 10, search?: string) {
    return ProjectModel.findByUserId(userId, page, limit, search);
  }

  async findRecent(userId: string, limit = 5) {
    return ProjectModel.getRecentActivity(userId, limit);
  }

  async findById(id: string, userId: string) {
    const project = await ProjectModel.findById(id, userId);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(userId: string, data: { name: string; description?: string }) {
    return ProjectModel.create({ ...data, user_id: userId });
  }

  async update(id: string, userId: string, data: { name?: string; description?: string }) {
    const project = await this.findById(id, userId);
    return ProjectModel.updateById(id, userId, data);
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    return ProjectModel.deleteById(id, userId);
  }
}
