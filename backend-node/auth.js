require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.includes('your_')) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET not set: using a temporary development secret.');
}

const TOKEN_TTL = '7d';
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;

const dbGet = (sql, params) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const dbRun = (sql, params) => new Promise((resolve, reject) =>
  db.run(sql, params, function (err) { return err ? reject(err) : resolve(this); }));

const publicUser = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role });

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT id, name, username, role FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-32 characters: letters, numbers, dot, dash or underscore' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    if (await dbGet('SELECT id FROM users WHERE username = ?', [username])) {
      return res.status(409).json({ error: 'That username is already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await dbRun(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, username, hash, 'user']
    );
    const user = { id: result.lastID, name: username, username, role: 'user' };
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = { router, requireAuth, requireAdmin };
