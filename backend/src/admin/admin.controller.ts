import { Controller, Get, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (paginated)' })
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: 'user' | 'admin',
    @Query('status') status?: 'active' | 'inactive',
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      role,
      status,
    });
  }

  @Get('users/:userId/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  getUserStats(@Param('userId') userId: string) {
    return this.adminService.getUserStats(userId);
  }

  @Put('users/:userId/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() body: { role: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    const result = await this.adminService.updateUserRole(userId, body.role);
    await this.adminService.logActivity(adminUserId, 'update_user_role', userId, { role: body.role });
    return result;
  }

  @Put('users/:userId/limits')
  @ApiOperation({ summary: 'Update user token limits' })
  async updateUserLimits(
    @Param('userId') userId: string,
    @Body() body: { global_limit?: number; monthly_limit?: number },
    @CurrentUser('id') adminUserId: string,
  ) {
    const result = await this.adminService.updateUserLimits(userId, body);
    await this.adminService.logActivity(adminUserId, 'update_user_token_limits', userId, body);
    return result;
  }

  @Put('users/:userId/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() body: { is_active: boolean },
    @CurrentUser('id') adminUserId: string,
  ) {
    const result = await this.adminService.updateUserStatus(userId, body.is_active);
    await this.adminService.logActivity(adminUserId, 'toggle_user_status', userId, { is_active: body.is_active });
    return result;
  }

  @Put('limits/global')
  @ApiOperation({ summary: 'Update global token limits' })
  async updateGlobalLimits(
    @Body() body: { global_limit?: number; monthly_limit?: number },
    @CurrentUser('id') adminUserId: string,
  ) {
    const result = await this.adminService.updateGlobalLimits(body);
    await this.adminService.logActivity(adminUserId, 'update_token_limits', undefined, body);
    return result;
  }

  @Get('token-limits')
  @ApiOperation({ summary: 'Get global token limits' })
  getGlobalLimits() {
    return this.adminService.getGlobalLimits();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get admin activity log' })
  getActivityLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('admin_user_id') adminUserId?: string,
    @Query('action_type') actionType?: string,
  ) {
    return this.adminService.getActivityLog({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      admin_user_id: adminUserId,
      action_type: actionType,
    });
  }
}
