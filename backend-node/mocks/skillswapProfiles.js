// DEMO DATA: fictional developers so SkillSwap has a pool to match against.
// `strengths` = what they can teach, `gaps` = what they want to learn.
const skillswapProfiles = [
  { name: 'Aarav Mehta', title: 'Full-Stack Developer', strengths: ['React', 'Node.js', 'MongoDB', 'Express', 'JavaScript'], gaps: ['Docker', 'AWS', 'Kubernetes'] },
  { name: 'Priya Nair', title: 'DevOps Engineer', strengths: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'], gaps: ['React', 'TypeScript', 'GraphQL'] },
  { name: 'Liam Carter', title: 'Backend Engineer', strengths: ['Python', 'Django', 'PostgreSQL', 'Redis', 'REST API'], gaps: ['React', 'Docker', 'Next.js'] },
  { name: 'Sofia Alvarez', title: 'Frontend Engineer', strengths: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'HTML'], gaps: ['Node.js', 'PostgreSQL', 'AWS'] },
  { name: 'Noah Kim', title: 'Cloud Engineer', strengths: ['AWS', 'Terraform', 'Docker', 'Linux', 'Python'], gaps: ['JavaScript', 'React', 'MongoDB'] },
  { name: 'Ishita Rao', title: 'Data Engineer', strengths: ['Python', 'Pandas', 'SQL', 'PostgreSQL', 'Scikit-learn'], gaps: ['Docker', 'Node.js', 'TypeScript'] },
  { name: 'Ethan Brooks', title: 'Mobile Developer', strengths: ['React Native', 'JavaScript', 'TypeScript', 'Firebase', 'Git'], gaps: ['Node.js', 'PostgreSQL', 'CI/CD'] },
  { name: 'Meera Iyer', title: 'ML Engineer', strengths: ['PyTorch', 'TensorFlow', 'Python', 'NumPy', 'Pandas'], gaps: ['Docker', 'AWS', 'FastAPI'] },
  { name: 'Lucas Fischer', title: 'Platform Engineer', strengths: ['Kubernetes', 'Go', 'Docker', 'CI/CD', 'Git'], gaps: ['Python', 'React', 'GraphQL'] },
  { name: 'Zara Khan', title: 'API Developer', strengths: ['GraphQL', 'Node.js', 'Express', 'TypeScript', 'MongoDB'], gaps: ['Docker', 'Redis', 'Kubernetes'] },
  { name: 'Diego Ramos', title: 'Java Developer', strengths: ['Java', 'Spring Boot', 'MySQL', 'Microservices', 'Git'], gaps: ['React', 'Docker', 'AWS'] },
  { name: 'Hannah Lee', title: 'Software Engineer', strengths: ['JavaScript', 'Vue.js', 'Node.js', 'Redis', 'Jest'], gaps: ['TypeScript', 'Docker', 'PostgreSQL'] }
];

module.exports = skillswapProfiles;
