-- Create token_usage table to track API usage statistics
CREATE TABLE
    IF NOT EXISTS token_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
        agent_id UUID REFERENCES agents (id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations (id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL, -- 'openai' or 'anthropic'
        model VARCHAR(100) NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost DECIMAL(10, 6) DEFAULT 0, -- Cost in USD
        request_type VARCHAR(50), -- 'chat', 'completion', etc.
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

-- Create indexes for efficient querying
CREATE INDEX idx_token_usage_user_id ON token_usage (user_id);

CREATE INDEX idx_token_usage_project_id ON token_usage (project_id);

CREATE INDEX idx_token_usage_agent_id ON token_usage (agent_id);

CREATE INDEX idx_token_usage_provider ON token_usage (provider);

CREATE INDEX idx_token_usage_created_at ON token_usage (created_at);

CREATE INDEX idx_token_usage_user_provider ON token_usage (user_id, provider);

-- Create a view for aggregated statistics
CREATE VIEW
    token_usage_stats AS
SELECT
    user_id,
    provider,
    model,
    DATE_TRUNC ('day', created_at) as usage_date,
    COUNT(*) as request_count,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens_used,
    SUM(estimated_cost) as total_cost
FROM
    token_usage
GROUP BY
    user_id,
    provider,
    model,
    DATE_TRUNC ('day', created_at);