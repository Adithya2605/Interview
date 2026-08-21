/**
 * SQLite database module using better-sqlite3 (synchronous, zero-config).
 * Stores resume sessions: extracted text, Gemini analysis, and generated questions.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'interviews.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS resume_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT    NOT NULL,
    job_role    TEXT,
    resume_text TEXT,
    analysis    TEXT,
    questions   TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

/**
 * Save a full interview session after Gemini analysis.
 * @returns {number} New session ID
 */
function saveSession(filename, jobRole, resumeText, analysis, questions) {
  const stmt = db.prepare(`
    INSERT INTO resume_sessions (filename, job_role, resume_text, analysis, questions, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(
    filename,
    jobRole || null,
    resumeText || null,
    JSON.stringify(analysis || {}),
    JSON.stringify(questions || {})
  );
  return result.lastInsertRowid;
}

/**
 * Fetch a single session by ID.
 */
function getSession(id) {
  const row = db.prepare('SELECT * FROM resume_sessions WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    analysis: JSON.parse(row.analysis || '{}'),
    questions: JSON.parse(row.questions || '{}')
  };
}

/**
 * List all sessions (most recent first, limit 50).
 */
function getAllSessions() {
  return db.prepare(
    'SELECT id, filename, job_role, created_at FROM resume_sessions ORDER BY created_at DESC LIMIT 50'
  ).all();
}

module.exports = { saveSession, getSession, getAllSessions };
