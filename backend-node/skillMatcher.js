const { normalizeSkillList } = require('./services/skillNormalizationService');
const skillswapProfiles = require('./mocks/skillswapProfiles');

const MAX_MATCHES = 5;

function intersect(a = [], b = []) {
  const bSet = new Set(normalizeSkillList(b).map(s => s.toLowerCase()));
  return normalizeSkillList(a).filter(s => bSet.has(s.toLowerCase()));
}

function findMatchesForCandidate(candidateSkills = [], candidateGaps = [], candidateName = 'Candidate') {
  const strengths = normalizeSkillList(candidateSkills);
  const strengthSet = new Set(strengths.map(s => s.toLowerCase()));

  // A skill cannot be both a strength and a gap.
  const gaps = normalizeSkillList(candidateGaps).filter(
    skill => !strengthSet.has(skill.toLowerCase())
  );

  const reciprocalMatches = skillswapProfiles
    .map(profile => {
      const profileStrengths = normalizeSkillList(profile.strengths || []);
      const profileGaps = normalizeSkillList(profile.gaps || []);

      const youCanTeach = intersect(strengths, profileGaps);
      const theyCanTeach = intersect(profileStrengths, gaps);

      if (!youCanTeach.length || !theyCanTeach.length) return null;

      return {
        name: profile.name,
        title: profile.title,
        compatibilityScore: Math.min(99, 55 + 10 * Math.min(2, youCanTeach.length) + 10 * Math.min(2, theyCanTeach.length)),
        youCanTeach,
        theyCanTeach,
        reason: `You can help ${profile.name} with ${youCanTeach.join(', ')}, and ${profile.name} can help you with ${theyCanTeach.join(', ')}.`,
        isDemo: true
      };
    })
    .filter(Boolean);

  if (reciprocalMatches.length >= MAX_MATCHES) {
    return reciprocalMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore).slice(0, MAX_MATCHES);
  }

  // DEMO FALLBACK: keep SkillSwap populated for presentations/testing even when
  // the current candidate has no explicit gap that overlaps the mock pool.
  // These are fictional profiles, never real users.
  const fallbackMatches = skillswapProfiles.map(profile => {
    const profileStrengths = normalizeSkillList(profile.strengths || []);
    const profileGaps = normalizeSkillList(profile.gaps || []);

    const youCanTeach = intersect(strengths, profileGaps);
    const profileExtraSkills = profileStrengths.filter(
      skill => !strengthSet.has(skill.toLowerCase())
    );
    const theyCanTeach = intersect(profileStrengths, gaps).length
      ? intersect(profileStrengths, gaps)
      : profileExtraSkills.slice(0, 2);

    if (!youCanTeach.length && !theyCanTeach.length) return null;

    const score = Math.min(
      96,
      50 +
      (youCanTeach.length ? 12 : 0) +
      Math.min(2, theyCanTeach.length) * 8
    );

    return {
      name: profile.name,
      title: profile.title,
      compatibilityScore: score,
      youCanTeach: youCanTeach.slice(0, 3),
      theyCanTeach: theyCanTeach.slice(0, 2),
      reason: youCanTeach.length
        ? `You can help ${profile.name} with ${youCanTeach.join(', ')}, and ${profile.name} can help you explore ${theyCanTeach.join(', ')}.`
        : `${profile.name} can help you explore ${theyCanTeach.join(', ')} based on this demo SkillSwap profile.`,
      isDemo: true
    };
  }).filter(Boolean);

  return fallbackMatches
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, MAX_MATCHES);
}

function findMatches() {
  return [];
}

module.exports = {
  findMatches,
  findMatchesForCandidate
};
