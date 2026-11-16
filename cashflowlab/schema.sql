-- Additive migration. Reuses LeaseLab students only; never modifies LeaseLab tables.
CREATE TABLE IF NOT EXISTS cf_sessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','closed')),
 variant INTEGER NOT NULL DEFAULT 0 CHECK (variant BETWEEN 0 AND 2),
 started_at TEXT,
 ends_at TEXT,
 closed_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS cf_one_live_session ON cf_sessions(status) WHERE status IN ('pending','running');
CREATE TABLE IF NOT EXISTS cf_attempts (
 session_id INTEGER NOT NULL REFERENCES cf_sessions(id),
 niu TEXT NOT NULL REFERENCES students(niu),
 method TEXT NOT NULL CHECK (method IN ('direct','indirect')),
 answers TEXT NOT NULL DEFAULT '{}',
 submitted_at TEXT,
 score REAL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (session_id, niu)
);
CREATE INDEX IF NOT EXISTS cf_attempts_status ON cf_attempts(session_id,method,submitted_at);
CREATE TABLE IF NOT EXISTS cf_login_limits (
 id TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, locked_until TEXT
);