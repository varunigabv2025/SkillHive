const assert = require('assert');
const test = require('node:test');
const {
  extractSkills,
  normalizeSkills,
  matchJobToResume,
  calculateAlignment
} = require('../services/evidenceEngine');

test('skill extraction avoids substring false positives', () => {
  assert.deepStrictEqual(extractSkills('I built a dashboard with React and REST APIs.'), ['React', 'REST API']);
  assert.ok(!extractSkills('The applicant will work on next steps and data.').includes('Next.js'));
  assert.ok(!extractSkills('I worked on a project in rural areas.').includes('R'));
});

test('aliases normalize to canonical skills', () => {
  assert.deepStrictEqual(
    normalizeSkills(['reactjs', 'React', 'nodejs', 'Node.js', 'postgres', 'psql']),
    ['React', 'Node.js', 'PostgreSQL']
  );
});

test('JD matching has no arbitrary fallback matches', () => {
  assert.deepStrictEqual(
    matchJobToResume(['React', 'Docker'], ['Python']),
    { matched: [], missing: ['React', 'Docker'], partial: [] }
  );
});

test('alignment is reproducible from the same inputs', () => {
  const result = calculateAlignment({
    jobSkills: ['React', 'Docker', 'SQL'],
    resumeSkills: ['React', 'SQL'],
    sections: ['Education', 'Projects']
  });
  assert.equal(result.matched_skills.length, 2);
  assert.deepStrictEqual(result.missing_skills, ['Node.js']);
  assert.equal(result.readiness_percentage, 67);
});
