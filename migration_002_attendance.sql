-- LeaseLab migration 002: run once on the existing Cloudflare D1 database BEFORE testing the new Worker.
-- Existing roster, access-code hashes, registered students, and submissions are preserved.
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings(key,value) VALUES('allocation','open');
CREATE TABLE IF NOT EXISTS interactions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 case_id INTEGER NOT NULL CHECK(case_id BETWEEN 1 AND 5),
 lessor_niu TEXT NOT NULL REFERENCES students(niu),
 lessee_niu TEXT NOT NULL REFERENCES students(niu),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(lessor_niu,lessee_niu)
);
CREATE INDEX IF NOT EXISTS idx_interactions_lessor ON interactions(lessor_niu);
CREATE INDEX IF NOT EXISTS idx_interactions_lessee ON interactions(lessee_niu);
-- The old 'matches' table remains untouched, but the new app uses 'interactions'.
-- Fixed role and case assignments in 'roster' are ignored.
