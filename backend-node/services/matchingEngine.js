/**
 * Truth-sensitive candidate matching.
 * Resume/JD skill extraction is deterministic. GitHub evidence is kept separate.
 */
const { normalizeSkills, matchJobToResume } = require('./evidenceEngine');
const { verifySkillsList } = require('./verificationService');

function buildCandidateProfile({
  rawResumeSkills = [],
  rawGithubSkills = [],
  rawJobSkills = [],
  githubAnalysis = null,
  coreMatch = {}
}) {
  const resumeSkills = normalizeSkills(rawResumeSkills);
  const githubSkills = normalizeSkills(rawGithubSkills);
  const jobSkills = normalizeSkills(rawJobSkills);

  const resumeSet = new Set(resumeSkills);
  const githubSet = new Set(githubSkills);
  const candidateEvidence = new Set([...resumeSkills, ...githubSkills]);

  const matchedSkills = [];
  const missingSkills = [];
  const partiallyMatchedSkills = [];

  jobSkills.forEach(skill => {
    if (resumeSet.has(skill) || githubSet.has(skill)) matchedSkills.push(skill);
    else missingSkills.push(skill);
  });

  const resumeMatchedSkills = jobSkills.filter(skill => resumeSet.has(skill));
  const githubMatchedSkills = jobSkills.filter(skill => githubSet.has(skill));
  const githubOnlyMatchedSkills = githubMatchedSkills.filter(skill => !resumeSet.has(skill));

  const { verifiedSkills, unverifiedClaims, verificationRatio } =
    verifySkillsList(resumeSkills, githubAnalysis);

  const matchPercentage = jobSkills.length
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : 0;

  const resumeAlignment = matchJobToResume(jobSkills, resumeSkills);

  return {
    resumeSkills,
    githubVerifiedSkills: githubSkills,
    inferredSkills: [...candidateEvidence],
    jobSkills,
    matchedSkills,
    missingSkills,
    partiallyMatchedSkills,
    resumeMatchedSkills,
    githubMatchedSkills,
    githubOnlyMatchedSkills,
    verifiedSkills,
    unverifiedClaims,
    verificationRatio,
    matchPercentage,
    resumeMatchPercentage: jobSkills.length
      ? Math.round((resumeMatchedSkills.length / jobSkills.length) * 100)
      : 0,
    confidenceScores: {
      resumeConfidence: resumeSkills.length ? 100 : 0,
      githubConfidence: githubAnalysis && !githubAnalysis.error ? 100 : 0,
      matchConfidence: jobSkills.length ? 100 : 0
    },
    resumeAlignment,
    sourceOfTruth: {
      resume: 'Deterministic text extraction',
      jobDescription: 'Deterministic text extraction',
      github: 'Repository evidence collected by GitHub analyzer',
      ai: 'Enrichment only; not authoritative for matching or verification'
    }
  };
}

module.exports = { buildCandidateProfile };
