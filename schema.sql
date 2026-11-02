CREATE TABLE IF NOT EXISTS students (niu TEXT PRIMARY KEY, name TEXT NOT NULL, pin_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('lessor','lessee')), case_id INTEGER NOT NULL CHECK(case_id BETWEEN 1 AND 5), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, lessor_niu TEXT NOT NULL UNIQUE REFERENCES students(niu), lessee_niu TEXT NOT NULL UNIQUE REFERENCES students(niu), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS submissions (niu TEXT PRIMARY KEY REFERENCES students(niu), data TEXT NOT NULL, submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- Instructor-only roster; populate using the separately generated PRIVATE SQL file, never from public GitHub.
CREATE TABLE IF NOT EXISTS roster (niu TEXT PRIMARY KEY, name TEXT NOT NULL, access_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('lessor','lessee')), case_id INTEGER NOT NULL CHECK(case_id BETWEEN 1 AND 5), claimed_at TEXT);

-- Attendance-driven roles and nonexclusive company interactions.
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
