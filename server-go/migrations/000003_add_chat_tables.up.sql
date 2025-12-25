-- 添加聊天记录相关表
-- 注意：PostgreSQL 10 需要使用 uuid-ossp 扩展和 uuid_generate_v4() 函数
-- 如果使用 PostgreSQL 13+，可以使用 gen_random_uuid()

-- 确保 uuid-ossp 扩展已安装
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 表：chat_conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL DEFAULT '新对话',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON chat_conversations(last_message_at DESC);

-- 表：chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  sequence INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_message_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id, sequence);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat_messages(created_at);

