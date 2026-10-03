require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set. Configure Render PostgreSQL DATABASE_URL before starting the backend.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

let initPromise;

async function initializeDatabase() {
  if (!connectionString) throw new Error('DATABASE_URL is required');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resume_analyses (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      job_title TEXT,
      job_description TEXT,
      resume_text TEXT,
      overall_score REAL,
      section_scores TEXT,
      matched_skills TEXT,
      missing_skills TEXT,
      improvement_tips TEXT,
      keyword_gaps TEXT,
      summary TEXT,
      ats_score REAL,
      parsing_issues TEXT,
      detected_sections TEXT,
      missing_sections TEXT,
      keyword_density TEXT,
      formatting_warnings TEXT,
      ats_verdict TEXT,
      rewrites TEXT,
      readiness_percentage REAL,
      gap_summary TEXT,
      skill_gaps TEXT,
      milestones TEXT,
      subject_line TEXT,
      cover_letter TEXT,
      highlights_used TEXT,
      tone TEXT,
      trust_score TEXT,
      skill_swap TEXT,
      interview_prep TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Add ownership to databases created before the user-isolation feature.
  await pool.query('ALTER TABLE resume_analyses ADD COLUMN IF NOT EXISTS user_id INTEGER');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON resume_analyses(user_id)');

  await seedAdmin();
  console.log('Connected to PostgreSQL and initialized SkillHive database.');
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = initializeDatabase().catch(err => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

function run(sql, params = [], callback) {
  ensureInitialized()
    .then(() => {
      const isInsert = /^\s*INSERT\s+/i.test(sql);
      const parts = sql.split('?');
      const translatedSql = parts.map((part, index) => (
        index < parts.length - 1 ? part + '$' + (index + 1) : part
      )).join('');
      const query = isInsert && !/\bRETURNING\b/i.test(translatedSql)
        ? `${translatedSql.trim()} RETURNING id`
        : translatedSql;

      return pool.query(query, params);
    })
    .then(result => {
      const row = result.rows?.[0];
      const context = {
        lastID: row?.id ?? null,
        changes: result.rowCount || 0
      };
      if (callback) callback.call(context, null);
      return context;
    })
    .catch(err => {
      console.error('Database run error:', err);
      if (callback) callback.call({}, err);
    });
}
function all(sql, params = [], callback) {
  ensureInitialized()
    .then(() => pool.query(sql, params))
    .then(result => callback(null, result.rows))
    .catch(err => {
      console.error('Database all error:', err);
      callback(err);
    });
}

function get(sql, params = [], callback) {
  ensureInitialized()
    .then(() => pool.query(sql, params))
    .then(result => callback(null, result.rows[0]))
    .catch(err => {
      console.error('Database get error:', err);
      callback(err);
    });
}

async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!username || !password) {
    console.warn('ADMIN_USERNAME / ADMIN_PASSWORD not set: no admin account will be created.');
    return;
  }

  const existing = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"
  );

  if (existing.rows.length > 0) {
    console.log('Admin account already exists; existing credentials preserved.');
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4)',
    [username, username, hash, 'admin']
  );
  console.log(`Admin account created (${username})`);
}

module.exports = {
  run,
  all,
  get,
  pool,
  ready: ensureInitialized()
};
