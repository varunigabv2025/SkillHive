/**
 * Strict GitHub verification.
 * A resume claim is verified only when the GitHub analyzer produced
 * concrete repository evidence for the same canonical skill.
 */
const { normalizeSkill } = require('./evidenceEngine');

const WEAK_EVIDENCE = /^(Primary repository language|Repository topic|Active GitHub profile)/i;

function verifySkill(skill, githubAnalysis) {
  const canonical = normalizeSkill(skill);
  if (!canonical || !githubAnalysis || githubAnalysis.error) {
    return { verified: false, evidence: null, level: 'unverified' };
  }

  const entries = Array.isArray(githubAnalysis.verifiedSkills)
    ? githubAnalysis.verifiedSkills
    : [];

  const entry = entries.find(item => normalizeSkill(item?.name) === canonical);
  if (!entry) return { verified: false, evidence: null, level: 'unverified' };

  const concrete = (entry.evidence || []).find(e => !WEAK_EVIDENCE.test(String(e || '')));
  if (concrete) {
    return {
      verified: true,
      evidence: concrete,
      level: 'strong'
    };
  }

  return {
    verified: false,
    evidence: entry.evidence?.[0] || null,
    level: 'weak'
  };
}

function verifySkillsList(resumeSkills = [], githubAnalysis = null) {
  const verifiedSkills = [];
  const unverifiedClaims = [];
  const weakEvidence = [];

  resumeSkills.forEach(skill => {
    const canonical = normalizeSkill(skill);
    if (!canonical) return;

    const result = verifySkill(canonical, githubAnalysis);
    if (result.verified) {
      verifiedSkills.push({
        skill: canonical,
        evidence: result.evidence,
        evidenceLevel: result.level
      });
    } else if (result.level === 'weak') {
      weakEvidence.push(canonical);
      unverifiedClaims.push(canonical);
    } else {
      unverifiedClaims.push(canonical);
    }
  });

  const total = verifiedSkills.length + unverifiedClaims.length;
  return {
    verifiedSkills,
    unverifiedClaims: [...new Set(unverifiedClaims)],
    weakEvidence: [...new Set(weakEvidence)],
    verificationRatio: total ? Math.round((verifiedSkills.length / total) * 100) : 0
  };
}

module.exports = { verifySkill, verifySkillsList };
