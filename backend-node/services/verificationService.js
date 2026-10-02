/**
 * Deep Code Verification Engine (SkillBridge AI)
 * Cross-references resume skills against GitHub repository evidence.
 */

const { normalizeSkill } = require('./skillNormalizationService');

function verifySkill(skill, githubAnalysis) {
  if (!githubAnalysis || githubAnalysis.error) {
    return { verified: false, evidence: null };
  }

  const normSkill = normalizeSkill(skill);
  const skillLower = normSkill.toLowerCase();
  if (!skillLower) return { verified: false, evidence: null };

  const languages = (githubAnalysis.languages || []).map(l => normalizeSkill(l).toLowerCase());
  const topics = (githubAnalysis.skills || []).map(s => normalizeSkill(s).toLowerCase());
  const repoNames = (githubAnalysis.repos || []).map(r => String(r.name || '').toLowerCase());
  const repoDescs = (githubAnalysis.repos || []).map(r => String(r.description || '').toLowerCase());

  // 0. Concrete evidence collected by the GitHub analyzer (manifests, config files)
  const proven = (githubAnalysis.verifiedSkills || []).find(v => normalizeSkill(v.name).toLowerCase() === skillLower);
  const concrete = (proven?.evidence || []).find(e => !/^(Primary repository language|Repository topic|Active GitHub profile)/.test(e));
  if (concrete) {
    return { verified: true, evidence: concrete };
  }

  // 1. Language verification
  if (languages.includes(skillLower)) {
    return { verified: true, evidence: `Verified in GitHub repository languages (${normSkill})` };
  }

  // 2. Topic/Skill verification
  if (topics.includes(skillLower)) {
    return { verified: true, evidence: `Verified in GitHub repository topics (${normSkill})` };
  }

  // 3. Repository name check
  for (const name of repoNames) {
    if (name.includes(skillLower) || skillLower.includes(name)) {
      return { verified: true, evidence: `Code evidence found in repository "${name}"` };
    }
  }

  // 4. Repository description check
  for (const desc of repoDescs) {
    if (desc.includes(skillLower)) {
      return { verified: true, evidence: `Code evidence documented in repository description` };
    }
  }

  // 5. Special flag checks
  if (normSkill === 'Docker' && githubAnalysis.hasDocker) {
    return { verified: true, evidence: 'Verified via Dockerfile inspection in GitHub repositories' };
  }

  if (normSkill === 'CI/CD' && githubAnalysis.hasCI) {
    return { verified: true, evidence: 'Verified via .github/workflows CI/CD configuration' };
  }

  if (normSkill === 'Git' && (githubAnalysis.repoCount > 0 || githubAnalysis.username)) {
    return { verified: true, evidence: `Verified via active GitHub profile (@${githubAnalysis.username})` };
  }

  return { verified: false, evidence: null };
}

function verifySkillsList(resumeSkills = [], githubAnalysis = null) {
  const verifiedSkills = [];
  const unverifiedClaims = [];

  resumeSkills.forEach(skill => {
    const norm = normalizeSkill(skill);
    const check = verifySkill(norm, githubAnalysis);
    if (check.verified) {
      verifiedSkills.push({
        skill: norm,
        evidence: check.evidence
      });
    } else {
      unverifiedClaims.push(norm);
    }
  });

  return {
    verifiedSkills,
    unverifiedClaims,
    verificationRatio: resumeSkills.length > 0 ? Math.round((verifiedSkills.length / resumeSkills.length) * 100) : 50
  };
}

module.exports = {
  verifySkill,
  verifySkillsList
};
