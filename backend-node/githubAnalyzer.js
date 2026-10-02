require('dotenv').config();
const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const TOPIC_ACRONYMS = new Set(['aws', 'ci', 'cd', 'ui', 'ux', 'api', 'sql', 'gcp', 'http', 'css', 'html']);
const TOPIC_ALIASES = {
  nodejs: 'Node.js',
  reactjs: 'React',
  vuejs: 'Vue.js',
  nextjs: 'Next.js',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  graphql: 'GraphQL',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  tailwindcss: 'Tailwind CSS',
  expressjs: 'Express',
  docker: 'Docker',
  kubernetes: 'Kubernetes'
};

function parseGithubUsername(urlOrUsername) {
  if (!urlOrUsername || typeof urlOrUsername !== 'string') return '';
  let cleaned = urlOrUsername.trim().replace(/\?.*$/, '').replace(/#.*$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  
  if (cleaned.includes('github.com/')) {
    const afterHost = cleaned.split('github.com/').pop();
    const parts = afterHost.split('/');
    return parts[0] || '';
  }
  
  return cleaned.split('/').pop() || '';
}

function normalizeTopic(topic) {
  if (!topic || typeof topic !== 'string') return '';
  const lower = topic.toLowerCase().trim();
  if (TOPIC_ALIASES[lower]) return TOPIC_ALIASES[lower];

  return topic
    .split(/[-_]/)
    .map(word => {
      const wordLower = word.toLowerCase();
      if (TOPIC_ACRONYMS.has(wordLower)) return wordLower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function githubHeaders() {
  const headers = {
    'User-Agent': 'SkillBridge-GitHub-Analyzer',
    Accept: 'application/vnd.github+json'
  };

  if (GITHUB_TOKEN && !GITHUB_TOKEN.includes('your_')) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  return headers;
}

function buildRateLimitError(error) {
  const status = error.response?.status;
  if (status !== 403 && status !== 429) return null;

  const remaining = error.response?.headers?.['x-ratelimit-remaining'];
  const resetHeader = error.response?.headers?.['x-ratelimit-reset'];
  const message = error.response?.data?.message || '';
  const isRateLimit = remaining === '0' || /rate limit/i.test(message);

  if (!isRateLimit) return null;

  const resetDate = resetHeader
    ? new Date(Number(resetHeader) * 1000).toISOString()
    : null;

  return {
    error: resetDate
      ? `GitHub API rate limit exceeded. Resets at ${resetDate}.`
      : 'GitHub API rate limit exceeded. Try again later.',
    status: 429
  };
}

async function fetchUserRepos(username) {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos`;
  const all = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const response = await axios.get(url, {
      headers: githubHeaders(),
      timeout: 10000,
      params: { per_page: 100, sort: 'pushed', page }
    });
    all.push(...response.data);
    if (response.data.length < 100) break;
  }
  return all;
}

const RAW_BASE = 'https://raw.githubusercontent.com';
const IGNORED_PATH = /(^|\/)(node_modules|vendor|dist|build|\.git|venv|\.venv|__pycache__)\//;
const MANIFEST_NAMES = new Set(['package.json', 'requirements.txt', 'pyproject.toml', 'pipfile', 'pom.xml', 'build.gradle']);
const MAX_MANIFESTS_PER_REPO = 40;
const MAX_SOURCE_FILES_PER_REPO = 40;
const MAX_SOURCE_FILE_BYTES = 200 * 1024;
const MIN_CODE_FILE_BYTES = 30;
const TREE_CONCURRENCY = 5;
const REPO_CONCURRENCY = 2;
const FILE_CONCURRENCY = 6;
const DUPLICATE_SIMILARITY = 0.85;
const MAX_REPO_PAGES = 5;

const CODE_EXTENSIONS = {
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', java: 'Java', c: 'C', cpp: 'C++', cc: 'C++', hpp: 'C++', cs: 'C#', go: 'Go', rs: 'Rust',
  rb: 'Ruby', php: 'PHP', swift: 'Swift', kt: 'Kotlin', dart: 'Dart', sql: 'SQL', html: 'HTML',
  css: 'CSS', scss: 'CSS', vue: 'Vue.js', sh: 'Shell', ipynb: 'Jupyter Notebook', tf: 'Terraform'
};
const SOURCE_EXTENSIONS = new Set(['js', 'jsx', 'mjs', 'ts', 'tsx', 'py']);
const JS_IMPORT_RE = /(?:require\(\s*|from\s+|import\s+)['"]([^'"./][^'"]*)['"]/g;
const PY_IMPORT_RE = /^\s*(?:from\s+([A-Za-z_]\w*)|import\s+([A-Za-z_][\w, ]*))/gm;
const PY_MODULE_ALIASES = {
  jwt: 'pyjwt', jose: 'python-jose', socketio: 'python-socketio', flask_socketio: 'flask-socketio',
  flask_jwt_extended: 'flask-jwt-extended', rest_framework: 'djangorestframework'
};


// npm dependency -> skills it proves. Matched against exact names or an `@scope/` prefix.
const NPM_RULES = [
  { match: ['react', 'react-dom'], skills: ['React'], confidence: 98 },
  { match: ['next'], skills: ['Next.js', 'React'], confidence: 98 },
  { match: ['vue'], skills: ['Vue.js'], confidence: 97 },
  { match: ['@angular/core'], skills: ['Angular'], confidence: 97 },
  { match: ['express'], skills: ['Express', 'Node.js', 'REST API'], confidence: 95 },
  { match: ['fastify', 'koa', '@nestjs/core', '@hapi/hapi'], skills: ['Node.js', 'REST API'], confidence: 94 },
  { match: ['typescript'], skills: ['TypeScript'], confidence: 96 },
  { match: ['tailwindcss'], skills: ['Tailwind CSS'], confidence: 94 },
  { match: ['jest', '@jest/core'], skills: ['Jest'], confidence: 93 },
  { match: ['mongodb', 'mongoose'], skills: ['MongoDB'], confidence: 95 },
  { match: ['pg', 'pg-promise', 'postgres', '@neondatabase/serverless'], skills: ['PostgreSQL', 'SQL'], confidence: 96 },
  { match: ['mysql', 'mysql2'], skills: ['MySQL', 'SQL'], confidence: 95 },
  { match: ['sqlite3', 'better-sqlite3', 'sequelize', 'typeorm', 'prisma', '@prisma/client', 'knex'], skills: ['SQL'], confidence: 92 },
  { match: ['redis', 'ioredis'], skills: ['Redis'], confidence: 93 },
  { match: ['jsonwebtoken', 'jose', 'passport-jwt', 'express-jwt', '@nestjs/jwt'], skills: ['JWT'], confidence: 96 },
  { match: ['ws', 'socket.io', 'socket.io-client', 'websocket'], skills: ['WebSockets'], confidence: 95 },
  { match: ['aws-sdk', '@aws-sdk/*'], skills: ['AWS'], confidence: 95 },
  { match: ['graphql', 'apollo-server', '@apollo/server', '@apollo/client'], skills: ['GraphQL'], confidence: 95 },
  { match: ['dockerode'], skills: ['Docker'], confidence: 85 },
  { match: ['nodemon', 'ts-node'], skills: ['Node.js'], confidence: 90 }
];

// Python/Java manifest text -> skills. Matched as whole package tokens, not loose substrings.
const TEXT_RULES = [
  { tokens: ['flask'], skills: ['Flask', 'Python', 'REST API'] },
  { tokens: ['django'], skills: ['Django', 'Python'] },
  { tokens: ['djangorestframework'], skills: ['REST API'] },
  { tokens: ['fastapi'], skills: ['FastAPI', 'Python', 'REST API'] },
  { tokens: ['torch', 'pytorch'], skills: ['PyTorch'] },
  { tokens: ['tensorflow'], skills: ['TensorFlow'] },
  { tokens: ['pandas'], skills: ['Pandas'] },
  { tokens: ['numpy'], skills: ['NumPy'] },
  { tokens: ['scikit-learn', 'sklearn'], skills: ['Scikit-learn'] },
  { tokens: ['psycopg2', 'psycopg2-binary', 'psycopg', 'asyncpg'], skills: ['PostgreSQL', 'SQL'] },
  { tokens: ['pymysql', 'mysql-connector-python', 'mysqlclient'], skills: ['MySQL', 'SQL'] },
  { tokens: ['sqlalchemy'], skills: ['SQL'] },
  { tokens: ['pymongo', 'motor'], skills: ['MongoDB'] },
  { tokens: ['redis'], skills: ['Redis'] },
  { tokens: ['pyjwt', 'python-jose', 'flask-jwt-extended', 'djangorestframework-simplejwt'], skills: ['JWT'] },
  { tokens: ['websockets', 'flask-socketio', 'python-socketio', 'channels'], skills: ['WebSockets'] },
  { tokens: ['boto3', 'botocore'], skills: ['AWS'] },
  { tokens: ['spring-boot', 'spring-boot-starter-web'], skills: ['Spring Boot', 'Java', 'REST API'] },
  { tokens: ['postgresql'], skills: ['PostgreSQL', 'SQL'] },
  { tokens: ['mysql-connector-java', 'mysql-connector-j'], skills: ['MySQL', 'SQL'] },
  { tokens: ['jjwt', 'java-jwt'], skills: ['JWT'] }
];

function recordProof(masterSkillMap, repoName, skill, proofText, confidence = 95) {
  if (!skill) return;
  const existing = masterSkillMap.get(skill);
  if (!existing) {
    masterSkillMap.set(skill, {
      name: skill,
      confidence,
      repositories: new Set([repoName]),
      evidence: new Set([proofText])
    });
  } else {
    existing.repositories.add(repoName);
    existing.evidence.add(proofText);
    existing.confidence = Math.min(99, Math.max(existing.confidence, confidence) + 1);
  }
}

function npmRuleFor(depName) {
  return NPM_RULES.find(rule =>
    rule.match.some(m => (m.endsWith('/*') ? depName.startsWith(m.slice(0, -1)) : depName === m))
  );
}

async function fetchRawFile(owner, repoName, branch, path) {
  const url = `${RAW_BASE}/${owner}/${repoName}/${branch || "HEAD"}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const response = await axios.get(url, {
    timeout: 5000,
    responseType: 'text',
    transformResponse: [data => data],
    headers: { 'User-Agent': 'SkillBridge-GitHub-Analyzer' }
  });
  return String(response.data);
}

function applyPackageJson(content, where, repoName, masterSkillMap) {
  const pkg = JSON.parse(content);
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  Object.keys(deps).forEach(depName => {
    const rule = npmRuleFor(depName);
    if (!rule) return;
    rule.skills.forEach(skill =>
      recordProof(masterSkillMap, repoName, skill, `${where}: "${depName}" dependency in ${repoName}`, rule.confidence)
    );
  });

  if (/(^|[\s&;])node\s/.test(Object.values(pkg.scripts || {}).join(' '))) {
    recordProof(masterSkillMap, repoName, 'Node.js', `${where}: node scripts in ${repoName}`, 90);
  }
}

function applyTokenRules(tokens, where, repoName, masterSkillMap, verb) {
  TEXT_RULES.forEach(rule => {
    const hit = rule.tokens.find(t => tokens.has(t));
    if (!hit) return;
    rule.skills.forEach(skill =>
      recordProof(masterSkillMap, repoName, skill, `${where}: "${hit}" ${verb} in ${repoName}`, 94)
    );
  });
}

function applyTextManifest(content, where, repoName, masterSkillMap) {
  const tokens = new Set(content.toLowerCase().split(/[^a-z0-9._-]+/).filter(Boolean));
  applyTokenRules(tokens, where, repoName, masterSkillMap, 'dependency');
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

const baseName = p => p.split('/').pop().toLowerCase();
const extOf = p => {
  const name = baseName(p);
  return name.includes('.') ? name.split('.').pop() : '';
};

async function fetchRepoTree(owner, repo) {
  try {
    const treeUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo.name}/git/trees/${encodeURIComponent(repo.default_branch || 'main')}`;
    const response = await axios.get(treeUrl, { headers: githubHeaders(), params: { recursive: 1 }, timeout: 10000 });
    const blobs = (response.data.tree || [])
      .filter(n => n.type === 'blob' && !IGNORED_PATH.test(n.path))
      .map(n => ({ path: n.path, size: n.size || 0 }));
    return { status: 'ok', blobs, truncated: Boolean(response.data.truncated) };
  } catch (e) {
    if (e.response?.status === 409 || e.response?.status === 404) return { status: 'empty' };
    if (buildRateLimitError(e)) return { status: 'rate_limited' };
    return { status: 'error', message: e.response?.status || e.message };
  }
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  a.forEach(x => { if (b.has(x)) shared++; });
  return shared / (a.size + b.size - shared);
}

function importedJsModules(source) {
  const modules = new Set();
  for (const m of source.matchAll(JS_IMPORT_RE)) {
    const parts = m[1].split('/');
    modules.add(m[1].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
  }
  return modules;
}

function importedPyTokens(source) {
  const tokens = new Set();
  for (const m of source.matchAll(PY_IMPORT_RE)) {
    const names = m[1] ? [m[1]] : m[2].split(',').map(s => s.trim().split(/\s+/)[0]);
    names.filter(Boolean).forEach(n => {
      const lower = n.toLowerCase();
      tokens.add(PY_MODULE_ALIASES[lower] || lower.replace(/_/g, '-'));
      tokens.add(lower);
    });
  }
  return tokens;
}

async function inspectRepo(owner, repo, blobs, masterSkillMap) {
  const repoName = repo.name;
  const paths = blobs.map(b => b.path);

  // Languages from every file in the repo, not just GitHub's primary-language guess
  const byLanguage = new Map();
  blobs.forEach(({ path, size }) => {
    const language = CODE_EXTENSIONS[extOf(path)];
    if (!language || size < MIN_CODE_FILE_BYTES) return;
    const entry = byLanguage.get(language) || { files: 0, bytes: 0 };
    entry.files += 1;
    entry.bytes += size;
    byLanguage.set(language, entry);
  });
  byLanguage.forEach((entry, language) => {
    if (entry.files >= 2 || entry.bytes >= 1000) {
      recordProof(masterSkillMap, repoName, language, `${entry.files} ${language} file(s) in ${repoName}`, 93);
    }
  });
  if (repo.language) {
    recordProof(masterSkillMap, repoName, repo.language, `Primary repository language (${repo.language})`, 90);
  }

  // Infrastructure and config files anywhere in the repo
  paths.forEach(p => {
    const name = baseName(p);
    if (name === 'dockerfile' || name.startsWith('dockerfile.') || name.startsWith('docker-compose.')) {
      recordProof(masterSkillMap, repoName, 'Docker', `${p} in ${repoName}`, 98);
    }
    if (p.startsWith('.github/workflows/') || name === '.gitlab-ci.yml' || name === '.travis.yml' || name === 'jenkinsfile') {
      recordProof(masterSkillMap, repoName, 'CI/CD', `${p} in ${repoName}`, 92);
    }
    if (name === 'tsconfig.json') recordProof(masterSkillMap, repoName, 'TypeScript', `${p} in ${repoName}`, 96);
    if (name.startsWith('tailwind.config')) recordProof(masterSkillMap, repoName, 'Tailwind CSS', `${p} in ${repoName}`, 95);
    if (name.startsWith('next.config')) recordProof(masterSkillMap, repoName, 'Next.js', `${p} in ${repoName}`, 96);
    if (name.startsWith('vite.config')) recordProof(masterSkillMap, repoName, 'Vite', `${p} in ${repoName}`, 94);
    if (name === 'schema.prisma') recordProof(masterSkillMap, repoName, 'SQL', `${p} in ${repoName}`, 92);
    if (name.endsWith('.tf')) recordProof(masterSkillMap, repoName, 'Terraform', `${p} in ${repoName}`, 95);
    if ((name === 'deployment.yaml' || name === 'deployment.yml') && /k8s|kubernetes|manifests?|helm/i.test(p)) {
      recordProof(masterSkillMap, repoName, 'Kubernetes', `${p} in ${repoName}`, 94);
    }
  });

  // Every dependency manifest in the repo
  const manifests = paths
    .filter(p => MANIFEST_NAMES.has(baseName(p)))
    .sort((a, b) => a.split('/').length - b.split('/').length)
    .slice(0, MAX_MANIFESTS_PER_REPO);

  await mapLimit(manifests, FILE_CONCURRENCY, async (manifestPath) => {
    try {
      const content = await fetchRawFile(owner, repoName, repo.default_branch, manifestPath);
      if (baseName(manifestPath) === 'package.json') {
        applyPackageJson(content, manifestPath, repoName, masterSkillMap);
      } else {
        applyTextManifest(content, manifestPath, repoName, masterSkillMap);
      }
    } catch (e) {
      console.warn(`[DEBUG GitHub] Could not read ${manifestPath} in "${repoName}": ${e.response?.status || e.message}`);
    }
  });

  // Source imports catch skills that no manifest declares. The largest files carry the most imports.
  const sources = blobs
    .filter(b => SOURCE_EXTENSIONS.has(extOf(b.path)) && b.size >= MIN_CODE_FILE_BYTES && b.size <= MAX_SOURCE_FILE_BYTES && !/\.min\./.test(b.path))
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_SOURCE_FILES_PER_REPO);

  await mapLimit(sources, FILE_CONCURRENCY, async ({ path }) => {
    try {
      const content = await fetchRawFile(owner, repoName, repo.default_branch, path);
      if (extOf(path) === 'py') {
        applyTokenRules(importedPyTokens(content), path, repoName, masterSkillMap, 'import');
      } else {
        importedJsModules(content).forEach(mod => {
          const rule = npmRuleFor(mod);
          if (!rule) return;
          rule.skills.forEach(skill =>
            recordProof(masterSkillMap, repoName, skill, `${path}: imports "${mod}" in ${repoName}`, rule.confidence - 2)
          );
        });
      }
    } catch (e) {
      // unreadable file: skip
    }
  });

  return { filesScanned: manifests.length + sources.length };
}

async function analyzeGithubProfile(urlOrUsername, resumeSkills = []) {
  const cleanUsername = parseGithubUsername(urlOrUsername);
  console.log(`[DEBUG GitHub] Step 1: Parsed username: "${cleanUsername}" from raw input: "${urlOrUsername}"`);

  if (!cleanUsername) {
    console.warn('[DEBUG GitHub] Failure: GitHub username is empty or invalid.');
    return { error: 'GitHub username is required', status: 400 };
  }

  let repos;

  try {
    console.log(`[DEBUG GitHub] Step 2: Calling GitHub API GET /users/${cleanUsername}/repos...`);
    repos = await fetchUserRepos(cleanUsername);
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`[DEBUG GitHub] Failure: GitHub user "${cleanUsername}" not found (404).`);
      return { error: `GitHub user "${cleanUsername}" not found`, status: 404 };
    }

    const rateLimitError = buildRateLimitError(error);
    if (rateLimitError) {
      console.warn(`[DEBUG GitHub] Failure: ${rateLimitError.error}`);
      return rateLimitError;
    }

    if (error.response) {
      console.warn(`[DEBUG GitHub] Failure: GitHub API ${error.response.status} ${error.response.statusText}`);
      return {
        error: `GitHub API error: ${error.response.status} ${error.response.statusText}`,
        status: error.response.status
      };
    }

    console.warn(`[DEBUG GitHub] Failure: Failed to reach GitHub API (${error.message})`);
    return { error: `Failed to reach GitHub API: ${error.message}`, status: 502 };
  }

  const listedRepos = repos || [];
  console.log(`[DEBUG GitHub] Step 3: ${listedRepos.length} public repositories listed for ${cleanUsername}.`);

  const skipped = [];
  const warnings = [];

  // Forks are someone else's work
  const ownRepos = listedRepos.filter(repo => {
    if (repo.fork) skipped.push({ name: repo.name, reason: 'fork' });
    return !repo.fork;
  });

  // Read every repo's file tree, then drop empty and docs-only repos
  const trees = await mapLimit(ownRepos, TREE_CONCURRENCY, repo => fetchRepoTree(repo.owner?.login || cleanUsername, repo));

  const candidates = [];
  let rateLimited = false;
  ownRepos.forEach((repo, i) => {
    const tree = trees[i];
    if (tree.status === 'rate_limited') {
      rateLimited = true;
      skipped.push({ name: repo.name, reason: 'not inspected: GitHub rate limit reached' });
    } else if (tree.status === 'error') {
      skipped.push({ name: repo.name, reason: `not inspected: ${tree.message}` });
    } else if (tree.status === 'empty' || repo.size === 0) {
      skipped.push({ name: repo.name, reason: 'empty repository' });
    } else {
      const codeFiles = tree.blobs.filter(b => CODE_EXTENSIONS[extOf(b.path)] && b.size >= MIN_CODE_FILE_BYTES);
      if (codeFiles.length === 0) {
        skipped.push({ name: repo.name, reason: 'no source files (only docs, assets or trivial files)' });
      } else {
        candidates.push({ repo, tree, signature: new Set(codeFiles.map(b => b.path)) });
      }
    }
  });
  if (rateLimited) {
    warnings.push('GitHub rate limit reached: some repositories were not inspected. Add a GITHUB_TOKEN for a higher limit.');
  }

  // Drop copies: a repo whose source file list nearly matches a more recently pushed one
  candidates.sort((a, b) => new Date(b.repo.pushed_at || 0) - new Date(a.repo.pushed_at || 0));
  const analyzed = [];
  candidates.forEach(candidate => {
    const original = analyzed.find(kept => jaccard(kept.signature, candidate.signature) >= DUPLICATE_SIMILARITY);
    if (original) {
      skipped.push({ name: candidate.repo.name, reason: `duplicate of ${original.repo.name}` });
    } else {
      analyzed.push(candidate);
    }
  });

  console.log(`[DEBUG GitHub] Step 4: ${analyzed.length} repos kept, ${skipped.length} skipped:`, skipped.map(s => `${s.name} (${s.reason})`).join('; '));

  const masterSkillMap = new Map();

  await mapLimit(analyzed, REPO_CONCURRENCY, async ({ repo, tree }) => {
    const owner = repo.owner?.login || cleanUsername;

    if (Array.isArray(repo.topics)) {
      repo.topics.forEach(t => {
        const norm = normalizeTopic(t);
        if (norm) recordProof(masterSkillMap, repo.name, norm, `Repository topic tagged in ${repo.name}`, 92);
      });
    }

    await inspectRepo(owner, repo, tree.blobs, masterSkillMap);
    if (tree.truncated) warnings.push(`Repository "${repo.name}" is very large; part of its file list was not scanned.`);
  });

  const analyzedRepos = analyzed.map(a => a.repo);
  if (analyzedRepos.length > 0) {
    recordProof(
      masterSkillMap, analyzedRepos[0].name, 'Git',
      `Active GitHub profile (@${cleanUsername}) with ${analyzedRepos.length} analyzed repositories`, 99
    );
    analyzedRepos.forEach(r => masterSkillMap.get('Git').repositories.add(r.name));
  }

  const lastCommitDate = analyzedRepos.reduce((latest, repo) => {
    if (!repo.pushed_at) return latest;
    return !latest || new Date(repo.pushed_at) > new Date(latest) ? repo.pushed_at : latest;
  }, null);

  const verifiedSkills = Array.from(masterSkillMap.values()).map(item => ({
    name: item.name,
    confidence: item.confidence,
    repositories: Array.from(item.repositories),
    evidence: Array.from(item.evidence)
  }));

  const skills = verifiedSkills.map(v => v.name);
  const languages = verifiedSkills
    .filter(v => Object.values(CODE_EXTENSIONS).includes(v.name) || analyzedRepos.some(r => r.language === v.name))
    .map(v => v.name);
  console.log(`[DEBUG GitHub] Step 5 & 6: ${verifiedSkills.length} Verified Skills extracted:`, skills.join(', '));

  const finalOutput = {
    username: cleanUsername,
    verifiedSkills,
    languages,
    skills,
    repos: analyzedRepos.map(r => ({ name: r.name, description: r.description, language: r.language })),
    repoCount: analyzedRepos.length,
    repoStats: { listed: listedRepos.length, analyzed: analyzedRepos.length, skipped },
    warnings,
    hasDocker: masterSkillMap.has('Docker'),
    hasCI: masterSkillMap.has('CI/CD'),
    lastCommitDate: lastCommitDate || null
  };

  console.log(`[DEBUG GitHub] Step 7: Returning complete githubAnalysis object to pipeline.`);
  return finalOutput;
}

module.exports = {
  parseGithubUsername,
  analyzeGithubProfile
};
