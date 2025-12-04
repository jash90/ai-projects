-- Migration: Add threads and thread_messages tables for better conversation management
-- This allows multiple conversation threads per project and switching agents within a thread

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create thread_messages table
CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_threads_project_id ON threads(project_id);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_created_at ON thread_messages(created_at);

-- Create trigger for updated_at on threads
DROP TRIGGER IF EXISTS update_threads_updated_at ON threads;
CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing conversations to threads
-- This creates a thread for each existing conversation and copies messages
DO $$
DECLARE
  conv RECORD;
  new_thread_id UUID;
  msg JSONB;
  msg_role VARCHAR(20);
  msg_content TEXT;
  msg_metadata JSONB;
  msg_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR conv IN SELECT * FROM conversations WHERE messages IS NOT NULL AND jsonb_array_length(messages) > 0
  LOOP
    -- Create a new thread for this conversation
    INSERT INTO threads (project_id, title, created_at, updated_at)
    VALUES (
      conv.project_id,
      'Migrated conversation',
      conv.created_at,
      conv.updated_at
    )
    RETURNING id INTO new_thread_id;

    -- Insert each message from the conversation
    FOR msg IN SELECT * FROM jsonb_array_elements(conv.messages)
    LOOP
      msg_role := msg->>'role';
      msg_content := msg->>'content';
      msg_metadata := COALESCE(msg->'metadata', '{}'::jsonb);
      msg_timestamp := COALESCE((msg->>'timestamp')::timestamp with time zone, conv.created_at);

      INSERT INTO thread_messages (thread_id, agent_id, role, content, metadata, created_at)
      VALUES (
        new_thread_id,
        conv.agent_id,
        msg_role,
        msg_content,
        msg_metadata,
        msg_timestamp
      );
    END LOOP;
  END LOOP;
END $$;
