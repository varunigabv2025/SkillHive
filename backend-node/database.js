const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'resume_analyses.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDb();
  }
});

function initDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS resume_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      interview_prep TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    }
  });

  // Ensure columns exist on existing databases
  db.run(`ALTER TABLE resume_analyses ADD COLUMN trust_score TEXT`, () => {});
  db.run(`ALTER TABLE resume_analyses ADD COLUMN skill_swap TEXT`, () => {});
  db.run(`ALTER TABLE resume_analyses ADD COLUMN interview_prep TEXT`, () => {});
  db.run(`ALTER TABLE resume_analyses ADD COLUMN user_id INTEGER`, () => {});

  initUsers().then(seedAdmin).catch(err => console.error('Error preparing users table:', err));
}

const run = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function (err) { return err ? reject(err) : resolve(this); }));
const all = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
const get = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

async function initUsers() {
  const columns = await all('PRAGMA table_info(users)');

  if (columns.length === 0) {
    await run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return;
  }

  if (columns.some(c => c.name === 'username')) return;

  // One-time migration from the email-based table: keep ids so existing analyses stay linked.
  console.log('Migrating users table from email to username login...');
  const oldUsers = await all('SELECT * FROM users');
  await run('ALTER TABLE users RENAME TO users_old');
  await run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const taken = new Set();
  for (const u of oldUsers) {
    const base = String(u.email || '').split('@')[0].replace(/[^A-Za-z0-9._-]/g, '') || 'user';
    let username = base;
    for (let n = 2; taken.has(username.toLowerCase()); n++) username = `${base}${n}`;
    taken.add(username.toLowerCase());
    await run(
      'INSERT INTO users (id, name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [u.id, username, username, u.password_hash, u.role, u.created_at]
    );
  }
  await run('DROP TABLE users_old');
}

async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!username || !password) {
    console.warn('ADMIN_USERNAME / ADMIN_PASSWORD not set: no admin account will be created.');
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const admin = await get("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");

  if (admin) {
    // Never overwrite an existing admin password on every restart.
    // This prevents a redeploy from unexpectedly invalidating the owner's login.
    console.log(`Admin account already exists (${username}); existing credentials preserved.`);
  } else {
    await run(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, username, hash, 'admin']
    );
    console.log(`Admin account created (${username})`);
  }
}

module.exports = db;
