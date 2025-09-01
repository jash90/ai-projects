-- Remove the previous real models
DELETE FROM ai_models
WHERE
    provider = 'anthropic';

-- Insert custom Anthropic models as requested by user
INSERT INTO
    ai_models (
        id,
        name,
        provider,
        description,
        max_tokens,
        created_at,
        updated_at
    )
VALUES
    (
        'claude-opus-4-1-20250805',
        'Claude Opus 4.1 (August 2025)',
        'anthropic',
        'Most advanced Claude Opus model with enhanced capabilities',
        8192,
        NOW (),
        NOW ()
    ),
    (
        'claude-opus-4-20250514',
        'Claude Opus 4 (May 2025)',
        'anthropic',
        'Claude Opus 4 with improved reasoning',
        8192,
        NOW (),
        NOW ()
    ),
    (
        'claude-sonnet-4-20250514',
        'Claude Sonnet 4 (May 2025)',
        'anthropic',
        'Balanced performance Claude Sonnet 4',
        8192,
        NOW (),
        NOW ()
    ),
    (
        'claude-3-7-sonnet-latest',
        'Claude 3.7 Sonnet (Latest)',
        'anthropic',
        'Latest Claude 3.7 Sonnet with optimizations',
        8192,
        NOW (),
        NOW ()
    ) ON CONFLICT (id) DO
UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    max_tokens = EXCLUDED.max_tokens,
    updated_at = NOW ();

-- Update any existing agents that were using the real models back to custom ones
UPDATE agents
SET
    model = 'claude-3-7-sonnet-latest'
WHERE
    provider = 'anthropic'
    AND model = 'claude-3-sonnet-20240229';