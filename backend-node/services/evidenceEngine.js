/**
 * Deterministic evidence engine.
 * AI is enrichment only; truth-sensitive matching comes from explicit evidence.
 */
const SKILL_ALIASES = {
  React: ['react', 'reactjs', 'react.js'],
  'React Native': ['react native', 'react-native'],
  'Next.js': ['next.js', 'nextjs'],
  'Node.js': ['node.js', 'nodejs', 'node js'],
  Express: ['express', 'expressjs', 'express.js'],
  JavaScript: ['javascript', 'ecmascript'],
  TypeScript: ['typescript'],
  Python: ['python'],
  Java: ['java'],
  'C++': ['c++', 'cpp'],
  C: ['c programming', 'programming in c', 'c language'],
  R: ['r programming', 'r language'],
  MATLAB: ['matlab'],
  SQL: ['sql'],
  MySQL: ['mysql'],
  PostgreSQL: ['postgresql', 'postgres', 'psql'],
  MongoDB: ['mongodb', 'mongo db', 'mongo'],
  Redis: ['redis'],
  Docker: ['docker', 'dockerfile', 'docker compose', 'docker-compose'],
  Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws', 'amazon web services'],
  'Google Cloud Platform': ['google cloud platform', 'google cloud', 'gcp'],
  'Microsoft Azure': ['microsoft azure', 'azure'],
  Terraform: ['terraform'],
  'CI/CD': ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery', 'github actions'],
  Linux: ['linux'],
  GraphQL: ['graphql'],
  'REST API': ['rest api', 'rest apis', 'restful api', 'restful apis', 'restful web service', 'restful services'],
  Git: ['git'],
  'GitHub Actions': ['github actions'],
  'Tailwind CSS': ['tailwind css', 'tailwindcss'],
  HTML5: ['html5', 'html'],
  CSS3: ['css3', 'css'],
  Jest: ['jest'],
  'Unit Testing': ['unit testing', 'unit tests'],
  PyTorch: ['pytorch', 'pytorch lightning'],
  TensorFlow: ['tensorflow'],
  'Scikit-learn': ['scikit-learn', 'scikit learn', 'sklearn'],
  Pandas: ['pandas'],
  NumPy: ['numpy'],
  OpenCV: ['opencv', 'open cv'],
  'Machine Learning': ['machine learning'],
  'Deep Learning': ['deep learning'],
  NLP: ['nlp', 'natural language processing'],
  LLM: ['llm', 'large language model', 'large language models'],
  'Generative AI': ['generative ai', 'genai', 'generative artificial intelligence'],
  'Computer Vision': ['computer vision'],
  'Data Science': ['data science'],
  FastAPI: ['fastapi', 'fast api'],
  Django: ['django'],
  Flask: ['flask'],
  'Spring Boot': ['spring boot', 'springboot'],
  Microservices: ['microservices', 'microservices architecture'],
  'System Design': ['system design'],
  Agile: ['agile'],
  JWT: ['jwt', 'json web token', 'json web tokens'],
  WebSockets: ['websockets', 'web sockets', 'websocket'],
  Prisma: ['prisma'],
  Vite: ['vite']
};

const ORDERED_SKILLS = Object.keys(SKILL_ALIASES);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^\${}()|[\\]\\]/g, '\\$&');
}

function containsAlias(text, alias) {
  const source = String(text || '').toLowerCase();
  const value = String(alias || '').toLowerCase().trim();
  if (!value) return false;
  const escaped = escapeRegExp(value);
  const pattern = new RegExp('(^|[^a-z0-9])' + escaped + '([^a-z0-9]|$)', 'i');
  return pattern.test(source);
}

function extractSkills(text) {
  return ORDERED_SKILLS.filter(skill =>
    SKILL_ALIASES[skill].some(alias => containsAlias(text, alias))
  );
}

function normalizeSkill(skill) {
  const value = String(skill || '').trim().toLowerCase();
  if (!value) return '';
  for (const canonical of ORDERED_SKILLS) {
    if (canonical.toLowerCase() === value) return canonical;
    if (SKILL_ALIASES[canonical].some(alias => alias.toLowerCase() === value)) return canonical;
  }
  return '';
}

function normalizeSkills(skills) {
  return [...new Set((Array.isArray(skills) ? skills : [])
    .map(normalizeSkill)
    .filter(Boolean))];
}

function matchJobToResume(jobSkills, resumeSkills) {
  const resume = new Set(normalizeSkills(resumeSkills));
  const matched = [];
  const missing = [];
  normalizeSkills(jobSkills).forEach(skill => {
    if (resume.has(skill)) matched.push(skill);
    else missing.push(skill);
  });
  return { matched, missing, partial: [] };
}

function calculateAlignment({ jobSkills, resumeSkills, sections = [] }) {
  const { matched, missing, partial } = matchJobToResume(jobSkills, resumeSkills);
  const total = matched.length + missing.length;
  const skills = total ? Math.round((matched.length / total) * 100) : 0;
  const keywords = skills;
  const evidence = resumeSkills.length ? Math.min(100, 50 + Math.min(50, resumeSkills.length * 5)) : 0;
  const experience = sections.includes('Experience') ? 100 : sections.includes('Projects') ? 70 : 40;
  const education = sections.includes('Education') ? 100 : 0;
  const overall = Math.round(
    skills * 0.55 + experience * 0.20 + education * 0.10 + keywords * 0.10 + evidence * 0.05
  );
  return {
    overall_score: overall,
    section_scores: { skills, experience, education, keywords },
    matched_skills: matched,
    missing_skills: missing,
    partial_skills: partial,
    keyword_gaps: missing,
    readiness_percentage: skills,
    evidence_score: evidence
  };
}

function calculateAts({ jobSkills, resumeSkills, detectedSections = [] }) {
  const alignment = calculateAlignment({ jobSkills, resumeSkills, sections: detectedSections });
  const sectionCoverage = Math.round((detectedSections.length / 6) * 100);
  const score = Math.round(alignment.skills * 0.65 + sectionCoverage * 0.35);
  const expected = ['Education', 'Skills', 'Projects', 'Experience', 'Certifications', 'Achievements'];
  const missingSections = expected.filter(section => !detectedSections.includes(section));
  return {
    ats_score: score,
    detected_sections: detectedSections,
    missing_sections: missingSections,
    parsing_issues: [],
    formatting_warnings: [],
    keyword_density: {
      high_match: alignment.matched_skills,
      partial_match: [],
      missing: alignment.missing_skills
    },
    ats_verdict: score >= 75
      ? 'Strong structural and keyword alignment'
      : 'Some ATS-relevant gaps remain'
  };
}

module.exports = {
  SKILL_ALIASES,
  ORDERED_SKILLS,
  extractSkills,
  normalizeSkill,
  normalizeSkills,
  matchJobToResume,
  calculateAlignment,
  calculateAts
};
