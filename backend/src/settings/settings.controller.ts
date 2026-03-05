import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.settingsService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { username?: string; email?: string },
  ) {
    return this.settingsService.updateProfile(userId, body);
  }

  @Put('password')
  @ApiOperation({ summary: 'Change password' })
  updatePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { current_password: string; new_password: string },
  ) {
    return this.settingsService.updatePassword(userId, body.current_password, body.new_password);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  getPreferences(@CurrentUser('id') userId: string) {
    return this.settingsService.getPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() body: { theme?: string; notifications_enabled?: boolean; email_notifications?: boolean },
  ) {
    return this.settingsService.updatePreferences(userId, body);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get user usage statistics' })
  getUsage(@CurrentUser('id') userId: string) {
    return this.settingsService.getUsage(userId);
  }
}
