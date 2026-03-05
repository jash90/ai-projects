import { Injectable } from '@nestjs/common';
import { UserModel } from '../models/User';
import { TokenService } from '../services/tokenService';

@Injectable()
export class UsageService {
  async getCurrentUsage(userId: string) {
    const usage = await UserModel.getTokenUsage(userId);
    const remainingGlobal = usage.limits.globalLimit > 0 ? Math.max(0, usage.limits.globalLimit - usage.totalTokens) : -1;
    const remainingMonthly = usage.limits.monthlyLimit > 0 ? Math.max(0, usage.limits.monthlyLimit - usage.monthlyTokens) : -1;
    return { ...usage, remaining: { global: remainingGlobal, monthly: remainingMonthly } };
  }

  async getUserSummary(userId: string, startDate?: Date, endDate?: Date) {
    return TokenService.getUserSummary(userId, startDate, endDate);
  }

  async getUserStats(userId: string, startDate?: Date, endDate?: Date) {
    return TokenService.getUserStats(userId, startDate, endDate);
  }

  async getProjectStats(projectId: string, userId: string) {
    return TokenService.getProjectStats(projectId, userId);
  }

  async getAgentStats(agentId: string, userId: string) {
    return TokenService.getAgentStats(agentId, userId);
  }
}
