import { Injectable } from '@nestjs/common';
import { modelService } from '../services/modelService';

@Injectable()
export class ModelsSyncService {
  async getAvailableModels() { return modelService.getAvailableModels(); }
  getProviderStatus() { return modelService.getProviderStatus(); }
  async getProviderStats() { return modelService.getProviderStats(); }
  async getModelsByProvider(provider: 'openai' | 'anthropic' | 'openrouter') { return modelService.getModelsByProvider(provider); }
  async getModelById(modelId: string) { return modelService.getModelById(modelId); }
  async syncAllModels() { modelService.clearCache(); return modelService.syncAllModels(); }
}
