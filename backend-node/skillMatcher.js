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

  return skillswapProfiles
    .map(profile => {
      const profileStrengths = normalizeSkillList(profile.strengths || []);
      const profileGaps = normalizeSkillList(profile.gaps || []);

      // Reciprocal matching:
      // 1. Candidate teaches something the peer wants.
      // 2. Peer teaches something the candidate needs.
      const youCanTeach = intersect(strengths, profileGaps);
      const theyCanTeach = intersect(profileStrengths, gaps);

      // A SkillSwap match should provide an actual exchange, not just a one-way overlap.
      if (!youCanTeach.length || !theyCanTeach.length) return null;

      const compatibilityScore = Math.min(
        99,
        55 +
        10 * Math.min(2, youCanTeach.length) +
        10 * Math.min(2, theyCanTeach.length)
      );

      return {
        name: profile.name,
        title: profile.title,
        compatibilityScore,
        youCanTeach,
        theyCanTeach,
        reason: `You can help ${profile.name} with ${youCanTeach.join(', ')}, and ${profile.name} can help you with ${theyCanTeach.join(', ')}.`,
        isDemo: true
      };
    })
    .filter(Boolean)
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
