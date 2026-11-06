-- Additive migration only. Does NOT modify LeaseLab tables, data or settings.
-- Run against the EXISTING D1 database: session10-lease-lab.
CREATE TABLE IF NOT EXISTS cl_sessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','closed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 started_at TEXT,
 ends_at TEXT,
 closed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS cl_one_active_session ON cl_sessions(status) WHERE status IN ('pending','running');
CREATE TABLE IF NOT EXISTS cl_attempts (
 session_id INTEGER NOT NULL REFERENCES cl_sessions(id),
 niu TEXT NOT NULL REFERENCES students(niu),
 variant INTEGER NOT NULL CHECK(variant BETWEEN 0 AND 2),
 answers TEXT NOT NULL DEFAULT '{}',
 score INTEGER,
 submitted_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (session_id,niu)
);
CREATE INDEX IF NOT EXISTS cl_attempts_session ON cl_attempts(session_id,submitted_at);