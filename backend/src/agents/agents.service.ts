import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AgentModel } from '../models/Agent';

@Injectable()
export class AgentsService {
  async findAll() {
    return AgentModel.findAll();
  }

  async findById(id: string) {
    const agent = await AgentModel.findById(id);
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async create(data: any) {
    return AgentModel.create(data);
  }

  async update(id: string, data: any) {
    await this.findById(id);
    return AgentModel.updateById(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    const usageCount = await AgentModel.getUsageCount(id);
    if (usageCount > 0) {
      throw new BadRequestException('Cannot delete agent that is in use');
    }
    return AgentModel.deleteById(id);
  }
}
