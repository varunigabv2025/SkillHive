const { verifySkillsList } = require('./services/verificationService');

function calculateTrustScore(resumeSkills = [], githubSkills = [], contextData = {}) {
  const { githubAnalysis } = contextData;
  const claims = [...new Set(resumeSkills || [])];

  if (!githubAnalysis || githubAnalysis.error) {
    return {
      score: claims.length ? 0 : 50,
      category: claims.length ? 'Unverified' : 'No claims to verify',
      verifiedSkills: [],
      unverifiedSkills: claims,
      verificationRatio: 0,
      unlocked: false,
      summary: claims.length
        ? 'GitHub verification was unavailable. Resume skill claims are not treated as verified.'
        : 'No resume skill claims were available for GitHub verification.'
    };
  }

  const audit = verifySkillsList(claims, githubAnalysis);
  const total = audit.verifiedSkills.length + audit.unverifiedClaims.length;
  const ratio = total ? Math.round((audit.verifiedSkills.length / total) * 100) : 0;

  // Trust is intentionally conservative: repository count/activity cannot
  // verify a specific resume claim. Only concrete evidence contributes.
  let score = ratio;
  if (total === 0) score = 50;

  let category = 'Low';
  if (score >= 80) category = 'High';
  else if (score >= 60) category = 'Medium';
  else if (score >= 40) category = 'Limited';

  return {
    score,
    category,
    verifiedSkills: audit.verifiedSkills.map(item => item.skill),
    verifiedEvidence: audit.verifiedSkills,
    unverifiedSkills: audit.unverifiedClaims,
    weakEvidence: audit.weakEvidence,
    verificationRatio: ratio,
    unlocked: score >= 50,
    summary: total
      ? `GitHub provides concrete evidence for ${audit.verifiedSkills.length} of ${total} resume skill claims. Claims without concrete evidence remain unverified.`
      : 'No recognizable resume skill claims were available for verification.'
  };
}

module.exports = { calculateTrustScore };
