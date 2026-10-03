const { normalizeSkillList } = require('./services/skillNormalizationService');
const skillswapProfiles = require('./mocks/skillswapProfiles');

const MAX_MATCHES = 5;

function intersect(a, b) {
    const bLower = new Set(b.map(s => s.toLowerCase()));
    return a.filter(s => bLower.has(s.toLowerCase()));
}

function findMatchesForCandidate(candidateSkills = [], candidateGaps = [], candidateName = 'Candidate') {
    const strengths = normalizeSkillList(candidateSkills);
    const strengthSet = new Set(strengths.map(s => s.toLowerCase()));
    // A skill cannot simultaneously be a strength and a weakness.
    const gaps = normalizeSkillList(candidateGaps).filter(
        skill => !strengthSet.has(skill.toLowerCase())
    );

    return skillswapProfiles
        .map(profile => {
            const youCanTeach = intersect(strengths, profile.gaps);
            const theyCanTeach = intersect(profile.strengths, gaps);
            if (youCanTeach.length === 0 && theyCanTeach.length === 0) return null;

            const compatibilityScore = Math.min(
                99,
                45 + 11 * Math.min(3, youCanTeach.length) + 11 * Math.min(3, theyCanTeach.length)
            );

            const parts = [];
            if (youCanTeach.length) parts.push(`you can help them with ${youCanTeach.join(', ')}`);
            if (theyCanTeach.length) parts.push(`${profile.name} can help you with ${theyCanTeach.join(', ')}`);

            return {
                name: profile.name,
                title: profile.title,
                compatibilityScore,
                youCanTeach,
                theyCanTeach,
                reason: `${parts.join(', and ')}.`,
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
