import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserModel } from '../models/User';

@Injectable()
export class SettingsService {
  async getProfile(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  async updateProfile(userId: string, updates: { username?: string; email?: string }) {
    // Check if email is already taken
    if (updates.email) {
      const existingUser = await UserModel.findByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email is already taken');
      }
    }

    // Check if username is already taken
    if (updates.username) {
      const query = 'SELECT id FROM users WHERE username = $1 AND id != $2';
      const result = await UserModel.query(query, [updates.username, userId]);
      if (result.rows.length > 0) {
        throw new BadRequestException('Username is already taken');
      }
    }

    const updatedUser = await UserModel.updateProfile(userId, updates);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      },
    };
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      await UserModel.updatePassword(userId, currentPassword, newPassword);
      return { message: 'Password updated successfully' };
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        throw new BadRequestException('Current password is incorrect');
      }
      throw error;
    }
  }

  async getPreferences(userId: string) {
    const preferences = await UserModel.getUserPreferences(userId);
    return { preferences };
  }

  async updatePreferences(
    userId: string,
    preferences: { theme?: string; notifications_enabled?: boolean; email_notifications?: boolean },
  ) {
    const updatedPreferences = await UserModel.updateUserPreferences(userId, preferences as any);
    return { preferences: updatedPreferences };
  }

  async getUsage(userId: string) {
    const stats = await UserModel.getUserStatsById(userId);
    return { stats };
  }
}
