/**
 * Canonical Skill Normalization Service (SkillBridge AI)
 * Standardizes skill synonyms across Resume, GitHub, and Job Description.
 */

const CANONICAL_MAP = {
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'es6': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'react': 'React',
  'reactjs': 'React',
  'react.js': 'React',
  'next': 'Next.js',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'vue': 'Vue.js',
  'vuejs': 'Vue.js',
  'vue.js': 'Vue.js',
  'express': 'Express',
  'expressjs': 'Express',
  'express.js': 'Express',
  'py': 'Python',
  'python': 'Python',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'java': 'Java',
  'spring': 'Spring Boot',
  'springboot': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'psql': 'PostgreSQL',
  'mysql': 'MySQL',
  'redis': 'Redis',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'docker': 'Docker',
  'container': 'Docker',
  'containers': 'Docker',
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'Google Cloud Platform',
  'google cloud': 'Google Cloud Platform',
  'google cloud platform': 'Google Cloud Platform',
  'azure': 'Microsoft Azure',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'github actions': 'CI/CD',
  'git': 'Git',
  'github': 'Git',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'html': 'HTML5',
  'html5': 'HTML5',
  'css': 'CSS3',
  'css3': 'CSS3',
  'tensorflow': 'TensorFlow',
  'tensor flow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'pytorch lightning': 'PyTorch',
  'scikit learn': 'Scikit-learn',
  'scikit-learn': 'Scikit-learn',
  'graphql': 'GraphQL',
  'rest': 'REST API',
  'rest api': 'REST API',
  'rest apis': 'REST API',
  'restful api': 'REST API',
  'restful apis': 'REST API',
  'restful': 'REST API',
  'jwt': 'JWT',
  'json web token': 'JWT',
  'json web tokens': 'JWT',
  'jwt authentication': 'JWT',
  'websocket': 'WebSockets',
  'websockets': 'WebSockets',
  'web sockets': 'WebSockets',
  'socket.io': 'WebSockets',
  'sql': 'SQL',
  'jest': 'Jest',
  'unit testing': 'Unit Testing',
  'microservices': 'Microservices',
  'system design': 'System Design',
  'agile': 'Agile'
};

function normalizeSkill(rawSkill) {
  if (!rawSkill || typeof rawSkill !== 'string') return '';
  const clean = rawSkill.trim().toLowerCase();
  return CANONICAL_MAP[clean] || (rawSkill.charAt(0).toUpperCase() + rawSkill.slice(1));
}

function normalizeSkillList(skillsArray = []) {
  if (!Array.isArray(skillsArray)) return [];
  const normalizedSet = new Set();
  skillsArray.forEach(sk => {
    const norm = normalizeSkill(sk);
    if (norm) normalizedSet.add(norm);
  });
  return [...normalizedSet];
}

module.exports = {
  normalizeSkill,
  normalizeSkillList,
  CANONICAL_MAP
};
