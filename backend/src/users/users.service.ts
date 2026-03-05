import { Injectable } from '@nestjs/common';
import { UserModel } from '../models/User';

@Injectable()
export class UsersService {
  async findById(id: string) {
    return UserModel.findById(id);
  }

  async findByEmail(email: string) {
    return UserModel.findByEmail(email);
  }

  async checkTokenLimit(userId: string, estimatedTokens: number) {
    return UserModel.checkTokenLimit(userId, estimatedTokens);
  }

  async getTokenUsage(userId: string) {
    return UserModel.getTokenUsage(userId);
  }

  async getAllUsersForAdmin() {
    return UserModel.getAllUsersForAdmin();
  }

  async getUserStatsById(userId: string) {
    return UserModel.getUserStatsById(userId);
  }

  async getAdminStats() {
    return UserModel.getAdminStats();
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    return UserModel.toggleUserStatus(userId, isActive);
  }

  async updateById(id: string, data: any) {
    return UserModel.updateById(id, data);
  }

  async updateProfile(id: string, data: any) {
    return UserModel.updateProfile(id, data);
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string) {
    return UserModel.updatePassword(id, currentPassword, newPassword);
  }

  async logAdminActivity(adminId: string, action: string, targetId: string, details: any) {
    return UserModel.logAdminActivity(adminId, action, targetId, details);
  }
}
