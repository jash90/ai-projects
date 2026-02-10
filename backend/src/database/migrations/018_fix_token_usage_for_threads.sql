-- Drop the FK constraint that prevents storing thread IDs in conversation_id.
-- The column now holds either conversation or thread UUIDs (polymorphic context ID).
ALTER TABLE token_usage DROP CONSTRAINT IF EXISTS token_usage_conversation_id_fkey;
