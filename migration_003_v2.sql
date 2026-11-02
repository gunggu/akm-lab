-- LeaseLab V2 MIGRATION: execute in D1 Console once, preserving existing data.
-- Before running: take a D1 backup. These ALTER TABLE statements are intentionally one-time.
ALTER TABLE students ADD COLUMN assigned_at TEXT;
UPDATE students SET assigned_at=CURRENT_TIMESTAMP WHERE (SELECT value FROM settings WHERE key='allocation')='closed';
ALTER TABLE interactions ADD COLUMN status TEXT NOT NULL DEFAULT 'requested';
ALTER TABLE interactions ADD COLUMN initiated_by TEXT;
ALTER TABLE interactions ADD COLUMN confirmed_at TEXT;
UPDATE interactions SET initiated_by=lessor_niu WHERE initiated_by IS NULL;
CREATE TABLE IF NOT EXISTS allocation_guard (id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS drafts (niu TEXT PRIMARY KEY REFERENCES students(niu),data TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,details TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS login_limits (id TEXT PRIMARY KEY,failures INTEGER NOT NULL DEFAULT 0,locked_until TEXT);
INSERT OR IGNORE INTO settings(key,value) VALUES('submissions','open');
UPDATE settings SET value='active' WHERE key='allocation' AND value='closed';
CREATE INDEX IF NOT EXISTS idx_interactions_status ON interactions(status);
