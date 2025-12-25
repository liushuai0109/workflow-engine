-- 回滚聊天记录相关表

DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP TABLE IF EXISTS chat_messages;

DROP INDEX IF EXISTS idx_conversations_last_message_at;
DROP INDEX IF EXISTS idx_conversations_updated_at;
DROP TABLE IF EXISTS chat_conversations;

