-- Update agents using old Anthropic model names to use valid ones
UPDATE agents 
SET model = 'claude-3-sonnet-20240229'
WHERE provider = 'anthropic' 
  AND model IN (
    'claude-opus-4-1-20250805',
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-latest'
  );

-- Update any conversations that might have the old model names in metadata
UPDATE conversations
SET messages = jsonb_set(
  messages,
  '{}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN msg->'metadata'->>'model' IN (
          'claude-opus-4-1-20250805',
          'claude-opus-4-20250514',
          'claude-sonnet-4-20250514',
          'claude-3-7-sonnet-latest'
        )
        THEN jsonb_set(
          msg,
          '{metadata,model}',
          '"claude-3-sonnet-20240229"'::jsonb
        )
        ELSE msg
      END
    )
    FROM jsonb_array_elements(messages) AS msg
  )
)
WHERE messages::text LIKE '%claude-opus-4%' 
   OR messages::text LIKE '%claude-sonnet-4%'
   OR messages::text LIKE '%claude-3-7-sonnet%';

-- Update ai_models table to remove old models and ensure new ones exist
DELETE FROM ai_models 
WHERE id IN (
  'claude-opus-4-1-20250805',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest'
);

-- Ensure the correct models exist
INSERT INTO ai_models (id, name, provider, description, max_tokens, created_at, updated_at)
VALUES 
  ('claude-3-opus-20240229', 'Claude 3 Opus', 'anthropic', 'Most capable Claude 3 model', 4096, NOW(), NOW()),
  ('claude-3-sonnet-20240229', 'Claude 3 Sonnet', 'anthropic', 'Balanced Claude 3 model', 4096, NOW(), NOW()),
  ('claude-3-haiku-20240307', 'Claude 3 Haiku', 'anthropic', 'Fast and efficient Claude 3 model', 4096, NOW(), NOW()),
  ('claude-2.1', 'Claude 2.1', 'anthropic', 'Previous generation Claude model', 4096, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = NOW();
