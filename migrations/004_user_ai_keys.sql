CREATE TABLE IF NOT EXISTS user_ai_keys (
  user_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('openai','gemini')),
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);