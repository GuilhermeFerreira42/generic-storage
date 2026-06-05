-- db/schema.sql
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT    PRIMARY KEY,
  workspace   TEXT    NOT NULL,
  mode        TEXT    NOT NULL DEFAULT 'auto_edit',
  title       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
  content     TEXT    NOT NULL,  -- JSON serializado do array de content blocks
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tool_name   TEXT    NOT NULL,
  input       TEXT    NOT NULL,  -- JSON
  result      TEXT,
  approved    INTEGER,           -- NULL=auto, 0=rejeitado, 1=aprovado
  executed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  description TEXT    NOT NULL,
  snapshot    TEXT    NOT NULL,  -- JSON do array messages no momento do checkpoint
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace, updated_at);
