CREATE TABLE IF NOT EXISTS admin_interviews (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  talent_profile TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('password', 'allowlist')),
  access_password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES auth_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at < ends_at),
  CHECK (
    (access_type = 'password' AND access_password_hash IS NOT NULL)
    OR (access_type = 'allowlist' AND access_password_hash IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS admin_interview_allowlist_users (
  interview_id BIGINT NOT NULL REFERENCES admin_interviews(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (interview_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_interviews_period
  ON admin_interviews(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_admin_interviews_active
  ON admin_interviews(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_interview_allowlist_user
  ON admin_interview_allowlist_users(user_id);
