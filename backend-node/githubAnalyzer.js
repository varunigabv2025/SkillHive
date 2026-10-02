require('dotenv').config();
const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const MAX_REPOS_TO_INSPECT = 10;

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
  const response = await axios.get(url, {
    headers: githubHeaders(),
    timeout: 10000,
    params: {
      per_page: 100,
      sort: 'pushed'
    }
  });
  return response.data;
}

async function inspectRepoFiles(owner, repoName, masterSkillMap) {
  function recordProof(techName, proofText, confidence = 95) {
    const norm = normalizeTopic(techName);
    if (!norm) return;

    if (!masterSkillMap.has(norm)) {
      masterSkillMap.set(norm, {
        name: norm,
        confidence,
        repositories: new Set([repoName]),
        evidence: new Set([proofText])
      });
    } else {
      const existing = masterSkillMap.get(norm);
      existing.repositories.add(repoName);
      existing.evidence.add(proofText);
      existing.confidence = Math.min(99, existing.confidence + 2);
    }
  }

  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/contents`;
    const response = await axios.get(url, { headers: githubHeaders(), timeout: 4000 });
    const files = Array.isArray(response.data) ? response.data : [];
    const fileNames = files.map(f => f.name.toLowerCase());

    console.log(`[DEBUG GitHub] Repo "${repoName}" root files inspected:`, fileNames.slice(0, 8).join(', '));

    // 1. package.json inspection
    if (fileNames.includes('package.json')) {
      try {
        const pkgUrl = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/contents/package.json`;
        const pkgRes = await axios.get(pkgUrl, { headers: githubHeaders(), timeout: 3500 });
        const content = Buffer.from(pkgRes.data.content, 'base64').toString('utf8');
        const pkg = JSON.parse(content);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (deps.react || deps['react-dom']) recordProof('React', `package.json: react dependency in ${repoName}`, 98);
        if (deps['next']) recordProof('Next.js', `package.json: next dependency in ${repoName}`, 98);
        if (deps['express']) recordProof('Express', `package.json: express dependency in ${repoName}`, 95);
        if (deps['typescript']) recordProof('TypeScript', `package.json: typescript dependency in ${repoName}`, 96);
        if (deps['tailwindcss']) recordProof('Tailwind CSS', `package.json: tailwindcss dependency in ${repoName}`, 94);
        if (deps['mongodb'] || deps['mongoose']) recordProof('MongoDB', `package.json: mongodb/mongoose dependency in ${repoName}`, 95);
        if (deps['pg'] || deps['sequelize'] || deps['typeorm'] || deps['prisma']) recordProof('PostgreSQL', `package.json: database driver in ${repoName}`, 95);
        if (deps['redis'] || deps['ioredis']) recordProof('Redis', `package.json: redis dependency in ${repoName}`, 92);
      } catch (e) {}
    }

    // 2. Python requirements.txt / Pipfile inspection
    if (fileNames.includes('requirements.txt') || fileNames.includes('pipfile')) {
      try {
        const reqUrl = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/contents/requirements.txt`;
        const reqRes = await axios.get(reqUrl, { headers: githubHeaders(), timeout: 3500 });
        const content = Buffer.from(reqRes.data.content, 'base64').toString('utf8').toLowerCase();

        if (content.includes('flask')) recordProof('Flask', `requirements.txt: flask dependency in ${repoName}`, 95);
        if (content.includes('django')) recordProof('Django', `requirements.txt: django dependency in ${repoName}`, 95);
        if (content.includes('fastapi')) recordProof('FastAPI', `requirements.txt: fastapi dependency in ${repoName}`, 95);
        if (content.includes('torch') || content.includes('pytorch')) recordProof('PyTorch', `requirements.txt: pytorch dependency in ${repoName}`, 96);
        if (content.includes('tensorflow')) recordProof('TensorFlow', `requirements.txt: tensorflow dependency in ${repoName}`, 96);
        if (content.includes('pandas')) recordProof('Pandas', `requirements.txt: pandas dependency in ${repoName}`, 94);
        if (content.includes('numpy')) recordProof('NumPy', `requirements.txt: numpy dependency in ${repoName}`, 94);
        if (content.includes('scikit-learn') || content.includes('sklearn')) recordProof('Scikit-learn', `requirements.txt: scikit-learn dependency in ${repoName}`, 95);
      } catch (e) {}
    }

    // 3. Docker & Deployment files
    if (fileNames.includes('dockerfile')) recordProof('Docker', `Dockerfile configuration in ${repoName}`, 98);
    if (fileNames.includes('docker-compose.yml') || fileNames.includes('docker-compose.yaml')) recordProof('Docker', `docker-compose configuration in ${repoName}`, 98);
    if (fileNames.includes('.github') || fileNames.includes('.travis.yml') || fileNames.includes('.gitlab-ci.yml') || fileNames.includes('jenkinsfile')) recordProof('CI/CD', `CI configuration in ${repoName}`, 90);
    if (fileNames.includes('tsconfig.json')) recordProof('TypeScript', `tsconfig.json configuration in ${repoName}`, 96);
    if (fileNames.some(f => f.startsWith('vite.config'))) recordProof('Vite', `vite.config configuration in ${repoName}`, 94);
    if (fileNames.some(f => f.startsWith('tailwind.config'))) recordProof('Tailwind CSS', `tailwind.config configuration in ${repoName}`, 95);
    if (fileNames.some(f => f.startsWith('next.config'))) recordProof('Next.js', `next.config configuration in ${repoName}`, 96);

  } catch (e) {}
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

  const allRepos = repos || [];
  const repoNames = allRepos.map(r => r.name);
  console.log(`[DEBUG GitHub] Step 3: ${allRepos.length} public repositories found for ${cleanUsername}:`, repoNames.slice(0, 10).join(', '));

  const masterSkillMap = new Map();

  // Inspect primary repository languages
  const languages = [...new Set(
    allRepos.map(repo => repo.language).filter(Boolean)
  )];
  console.log(`[DEBUG GitHub] Detected repository languages:`, languages.join(', '));

  languages.forEach(lang => {
    const norm = normalizeTopic(lang);
    if (norm) {
      masterSkillMap.set(norm, {
        name: norm,
        confidence: 90,
        repositories: new Set(allRepos.filter(r => r.language === lang).map(r => r.name)),
        evidence: new Set([`Primary repository language (${lang})`])
      });
    }
  });

  // Record Git evidence for profile with repos
  if (allRepos.length > 0) {
    masterSkillMap.set('Git', {
      name: 'Git',
      confidence: 99,
      repositories: new Set(repoNames),
      evidence: new Set([`Active GitHub profile (@${cleanUsername}) with ${allRepos.length} public repositories`])
    });
  }

  const lastCommitDate = allRepos.reduce((latest, repo) => {
    if (!repo.pushed_at) return latest;
    if (!latest || new Date(repo.pushed_at) > new Date(latest)) {
      return repo.pushed_at;
    }
    return latest;
  }, null);

  const reposToInspect = allRepos.slice(0, MAX_REPOS_TO_INSPECT);
  console.log(`[DEBUG GitHub] Step 4: Inspecting manifest files across top ${reposToInspect.length} repositories...`);

  for (const repo of reposToInspect) {
    const owner = repo.owner?.login || cleanUsername;

    // Check repository topics
    if (Array.isArray(repo.topics)) {
      repo.topics.forEach(t => {
        const norm = normalizeTopic(t);
        if (norm) {
          if (!masterSkillMap.has(norm)) {
            masterSkillMap.set(norm, {
              name: norm,
              confidence: 92,
              repositories: new Set([repo.name]),
              evidence: new Set([`Repository topic tagged in ${repo.name}`])
            });
          } else {
            const existing = masterSkillMap.get(norm);
            existing.repositories.add(repo.name);
            existing.evidence.add(`Repository topic tagged in ${repo.name}`);
          }
        }
      });
    }

    // Inspect files & manifests
    await inspectRepoFiles(owner, repo.name, masterSkillMap);
  }

  const verifiedSkills = Array.from(masterSkillMap.values()).map(item => ({
    name: item.name,
    confidence: item.confidence,
    repositories: Array.from(item.repositories),
    evidence: Array.from(item.evidence)
  }));

  const skills = verifiedSkills.map(v => v.name);
  console.log(`[DEBUG GitHub] Step 5 & 6: ${verifiedSkills.length} Verified Skills extracted:`, skills.join(', '));

  const finalOutput = {
    username: cleanUsername,
    verifiedSkills,
    languages,
    skills,
    repos: allRepos.map(r => ({ name: r.name, description: r.description, language: r.language })),
    repoCount: allRepos.length,
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
