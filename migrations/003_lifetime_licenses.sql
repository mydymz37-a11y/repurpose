CREATE TABLE IF NOT EXISTS license_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('starter','pro','agency')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','appsumo','lemonsqueezy','stripe')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','redeemed','revoked')),
  redeemed_by TEXT,
  redeemed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS license_codes_status_idx ON license_codes(status, plan);
CREATE TABLE IF NOT EXISTS user_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  code_id UUID UNIQUE REFERENCES license_codes(id),
  plan TEXT NOT NULL CHECK (plan IN ('starter','pro','agency')),
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  project_limit INTEGER NOT NULL,
  advanced_exports BOOLEAN NOT NULL DEFAULT FALSE,
  client_workspaces BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS user_licenses_status_idx ON user_licenses(status, plan);