CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_members_user ON conversation_members(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_message_receipts_user ON message_receipts(user_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX idx_call_history_users ON call_history(caller_id, callee_id, created_at DESC);
