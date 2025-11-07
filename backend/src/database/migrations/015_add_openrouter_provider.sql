-- Add OpenRouter as a supported provider

-- Update agents table constraint to include openrouter
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_provider_check;
ALTER TABLE agents ADD CONSTRAINT agents_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'openrouter'));

-- Update ai_models table constraint to include openrouter
ALTER TABLE ai_models DROP CONSTRAINT IF EXISTS ai_models_provider_check;
ALTER TABLE ai_models ADD CONSTRAINT ai_models_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'openrouter'));
