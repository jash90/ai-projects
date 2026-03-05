import { Controller, Get, Post, Param, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModelsSyncService } from './models-sync.service';

@ApiTags('Models')
@ApiBearerAuth()
@Controller('models')
export class ModelsSyncController {
  constructor(private service: ModelsSyncService) {}

  @Get()
  @ApiOperation({ summary: 'List available AI models' })
  async findAll() {
    const models = await this.service.getAvailableModels();
    return { models, count: models.length };
  }

  @Get('providers/status')
  @ApiOperation({ summary: 'Get provider status' })
  async getProviderStatus() {
    const providerStatus = this.service.getProviderStatus();
    const providerStats = await this.service.getProviderStats();
    return {
      providers: Object.keys(providerStatus).map(provider => ({
        name: provider, configured: providerStatus[provider],
        active_models: providerStats[provider]?.active || 0,
        total_models: providerStats[provider]?.total || 0,
      })),
    };
  }

  @Get('providers/:provider')
  @ApiOperation({ summary: 'Get models by provider' })
  async getByProvider(@Param('provider') provider: string) {
    if (!['openai', 'anthropic', 'openrouter'].includes(provider)) {
      throw new BadRequestException('Invalid provider');
    }
    const models = await this.service.getModelsByProvider(provider as any);
    return { provider, models, count: models.length };
  }

  @Get(':modelId')
  @ApiOperation({ summary: 'Get model details' })
  async findOne(@Param('modelId') modelId: string) {
    const model = await this.service.getModelById(modelId);
    if (!model) throw new NotFoundException('Model not found');
    return { model };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync models from providers' })
  async sync() {
    const results = await this.service.syncAllModels();
    const totalAdded = results.reduce((sum: number, r: any) => sum + r.models_added, 0);
    const totalUpdated = results.reduce((sum: number, r: any) => sum + r.models_updated, 0);
    const totalRemoved = results.reduce((sum: number, r: any) => sum + r.models_removed, 0);
    return { results, summary: { total_added: totalAdded, total_updated: totalUpdated, total_removed: totalRemoved } };
  }
}
