import { pool } from '../database/connection';
import { AIModel } from '../services/modelService';
import logger from '../utils/logger';

export class AIModelModel {
  /**
   * Create the ai_models table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ai_models (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic')),
        description TEXT,
        max_tokens INTEGER NOT NULL DEFAULT 4096,
        supports_vision BOOLEAN NOT NULL DEFAULT FALSE,
        supports_function_calling BOOLEAN NOT NULL DEFAULT FALSE,
        cost_per_1k_input_tokens DECIMAL(10,4) NOT NULL DEFAULT 0,
        cost_per_1k_output_tokens DECIMAL(10,4) NOT NULL DEFAULT 0,
        context_window INTEGER NOT NULL DEFAULT 4096,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
      CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
      CREATE INDEX IF NOT EXISTS idx_ai_models_provider_active ON ai_models(provider, is_active);

      -- Create trigger to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_ai_models_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_ai_models_updated_at ON ai_models;
      CREATE TRIGGER trigger_ai_models_updated_at
        BEFORE UPDATE ON ai_models
        FOR EACH ROW
        EXECUTE FUNCTION update_ai_models_updated_at();
    `;

    await pool.query(query);
    logger.info('AI models table created successfully');
  }

  /**
   * Get all active models
   */
  static async findAll(): Promise<AIModel[]> {
    const query = `
      SELECT * FROM ai_models 
      WHERE is_active = TRUE 
      ORDER BY provider, name
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToModel(row));
  }

  /**
   * Get models by provider
   */
  static async findByProvider(provider: 'openai' | 'anthropic'): Promise<AIModel[]> {
    const query = `
      SELECT * FROM ai_models 
      WHERE provider = $1 AND is_active = TRUE 
      ORDER BY name
    `;
    
    const result = await pool.query(query, [provider]);
    return result.rows.map(row => this.mapRowToModel(row));
  }

  /**
   * Get a specific model by ID
   */
  static async findById(id: string): Promise<AIModel | null> {
    const query = `
      SELECT * FROM ai_models 
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToModel(result.rows[0]) : null;
  }

  /**
   * Create or update a model
   */
  static async upsert(model: AIModel): Promise<AIModel> {
    const query = `
      INSERT INTO ai_models (
        id, name, provider, description, max_tokens, supports_vision, 
        supports_function_calling, cost_per_1k_input_tokens, 
        cost_per_1k_output_tokens, context_window, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        max_tokens = EXCLUDED.max_tokens,
        supports_vision = EXCLUDED.supports_vision,
        supports_function_calling = EXCLUDED.supports_function_calling,
        cost_per_1k_input_tokens = EXCLUDED.cost_per_1k_input_tokens,
        cost_per_1k_output_tokens = EXCLUDED.cost_per_1k_output_tokens,
        context_window = EXCLUDED.context_window,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      model.id,
      model.name,
      model.provider,
      model.description,
      model.max_tokens,
      model.supports_vision,
      model.supports_function_calling,
      model.cost_per_1k_input_tokens,
      model.cost_per_1k_output_tokens,
      model.context_window
    ];

    const result = await pool.query(query, values);
    return this.mapRowToModel(result.rows[0]);
  }

  /**
   * Bulk upsert models
   */
  static async bulkUpsert(models: AIModel[]): Promise<{ added: number; updated: number }> {
    if (models.length === 0) {
      return { added: 0, updated: 0 };
    }

    let added = 0;
    let updated = 0;

    for (const model of models) {
      const existingModel = await this.findById(model.id);
      if (existingModel) {
        updated++;
      } else {
        added++;
      }
      await this.upsert(model);
    }

    logger.info(`Bulk upsert completed: ${added} added, ${updated} updated`);
    return { added, updated };
  }

  /**
   * Deactivate models that are no longer available
   */
  static async deactivateModels(provider: 'openai' | 'anthropic', activeModelIds: string[]): Promise<number> {
    if (activeModelIds.length === 0) {
      // If no active models, deactivate all for this provider
      const query = `
        UPDATE ai_models 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
        WHERE provider = $1 AND is_active = TRUE
        RETURNING id
      `;
      const result = await pool.query(query, [provider]);
      return result.rowCount || 0;
    }

    const placeholders = activeModelIds.map((_, i) => `$${i + 2}`).join(',');
    const query = `
      UPDATE ai_models 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE provider = $1 AND id NOT IN (${placeholders}) AND is_active = TRUE
      RETURNING id
    `;
    
    const result = await pool.query(query, [provider, ...activeModelIds]);
    return result.rowCount || 0;
  }

  /**
   * Get provider statistics
   */
  static async getProviderStats(): Promise<Record<string, { active: number; total: number }>> {
    const query = `
      SELECT 
        provider,
        COUNT(*) as total,
        SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active
      FROM ai_models 
      GROUP BY provider
    `;
    
    const result = await pool.query(query);
    const stats: Record<string, { active: number; total: number }> = {};
    
    for (const row of result.rows) {
      stats[row.provider] = {
        active: parseInt(row.active),
        total: parseInt(row.total)
      };
    }
    
    return stats;
  }

  /**
   * Map database row to AIModel interface
   */
  private static mapRowToModel(row: any): AIModel {
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      description: row.description,
      max_tokens: row.max_tokens,
      supports_vision: row.supports_vision,
      supports_function_calling: row.supports_function_calling,
      cost_per_1k_input_tokens: parseFloat(row.cost_per_1k_input_tokens),
      cost_per_1k_output_tokens: parseFloat(row.cost_per_1k_output_tokens),
      context_window: row.context_window,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
