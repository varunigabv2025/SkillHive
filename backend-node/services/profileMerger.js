/**
 * Profile Merger Service (SkillBridge AI)
 * 
 * Person B Responsibility: Aggregates ResumeIQ analysis output and Person A's 
 * GitHub Analyzer output to generate a Unified Profile object.
 */

const { validateUnifiedProfileSchema } = require('../models/unifiedProfileSchema');

/**
 * Stub for future AI-driven career domain classification (e.g. via Gemini).
 * Currently returns an empty array as required.
 * 
 * @param {Object} resumeAnalysis 
 * @param {Object} githubAnalysis 
 * @returns {Array<string>} Empty array stub.
 */
function deriveCareerDomains(resumeAnalysis, githubAnalysis) {
  // Reserved for future AI domain inference module
  return [];
}

/**
 * Pure factory helper function to assemble the Unified Profile object.
 * Avoids unnecessary OOP classes and ensures exact schema key alignment.
 * 
 * @param {Object} data - Processed components for the profile.
 * @returns {Object} Unified Profile object.
 */
function createUnifiedProfile(data = {}) {
  return {
    user: {
      name: data.user?.name || 'Candidate',
      email: data.user?.email || '',
      title: data.user?.title || 'Software Developer'
    },
    resume: data.resume || null,
    github: data.github || null,
    verifiedSkills: data.verifiedSkills || [],
    unverifiedClaims: data.unverifiedClaims || [],
    resumeRecommendations: data.resumeRecommendations || [],
    strengths: data.strengths || [],
    weaknesses: data.weaknesses || [],
    careerDomains: data.careerDomains || [],
    metadata: {
      version: '1.0.0',
      createdAt: data.metadata?.createdAt || new Date().toISOString(),
      mergeVersion: 'v1',
      generatedBy: 'SkillBridge-ProfileMerger',
      mergeStatus: data.metadata?.mergeStatus || 'SUCCESS'
    }
  };
}

/**
 * Main Profile Merger algorithm combining ResumeIQ output and GitHub Analyzer output.
 * 
 * @param {Object} resumeAnalysis - Raw JSON payload from ResumeIQ.
 * @param {Object} githubAnalysis - Raw JSON payload from GitHub Analyzer (Person A).
 * @returns {Object} Unified Profile object.
 */
function mergeProfile(resumeAnalysis = {}, githubAnalysis = {}) {
  // 1. Internally map ResumeIQ's existing structure (core_match.matched_skills)
  // while supporting fallback to resumeAnalysis.skills
  const resumeSkills = resumeAnalysis?.core_match?.matched_skills || 
                       resumeAnalysis?.skills || 
                       [];

  // 2. Extract GitHub skills provided by Person A's analyzer
  const githubSkills = githubAnalysis?.skills || [];

  // Normalize helper for case-insensitive comparison
  const normalize = (str) => String(str || '').trim().toLowerCase();

  // Create lookup map of normalized GitHub skills
  const githubSkillMap = new Map();
  githubSkills.forEach(skill => {
    githubSkillMap.set(normalize(skill), skill);
  });

  // Create lookup map of normalized Resume skills
  const resumeSkillMap = new Map();
  resumeSkills.forEach(skill => {
    resumeSkillMap.set(normalize(skill), skill);
  });

  // 3. Compute verifiedSkills (Intersection of resumeSkills & githubSkills)
  const verifiedSkills = [];
  const verifiedSkillSet = new Set();

  resumeSkills.forEach(skill => {
    const normalized = normalize(skill);
    if (githubSkillMap.has(normalized)) {
      verifiedSkills.push({
        skill: skill,
        evidence: 'Found in GitHub repositories'
      });
      verifiedSkillSet.add(normalized);
    }
  });

  // 4. Compute unverifiedClaims (Resume skills missing in GitHub)
  const unverifiedClaims = resumeSkills.filter(
    skill => !verifiedSkillSet.has(normalize(skill))
  );

  // 5. Compute concise, sentence-style resume recommendations.
  const resumeRecommendations = [];

  unverifiedClaims.forEach(skill => {
    resumeRecommendations.push(
      `For ${skill}, mention the specific project, feature, or implementation where you used it instead of listing the skill alone.`
    );
  });

  githubSkills
    .filter(skill => !resumeSkillMap.has(normalize(skill)))
    .forEach(skill => {
      resumeRecommendations.push(
        `Highlight ${skill} in the relevant project or experience section when your GitHub work provides concrete evidence of using it.`
      );
    });

  if (resumeRecommendations.length === 0) {
    resumeRecommendations.push(
      'Describe your strongest projects with the technology used, what you built, and the problem or requirement you solved.'
    );
    resumeRecommendations.push(
      'Replace generic project descriptions with measurable outcomes such as accuracy, performance, users served, or features delivered whenever those numbers are available.'
    );
    resumeRecommendations.push(
      'Link your most relevant GitHub repositories directly from the corresponding project entries so your technical work is easy to verify.'
    );
  }

  // 6. Aggregate Strengths
  const strengths = [];
  if (verifiedSkills.length > 0) {
    const verifiedNames = verifiedSkills.map(v => v.skill).join(', ');
    strengths.push(`Practical code proof on GitHub for verified skills: ${verifiedNames}`);
  }
  const overallScore = resumeAnalysis?.core_match?.overall_score || resumeAnalysis?.overall_score;
  if (typeof overallScore === 'number' && overallScore >= 75) {
    strengths.push(`Strong resume alignment with an overall score of ${overallScore}%`);
  }

  // 7. Aggregate Weaknesses
  const weaknesses = [];
  if (unverifiedClaims.length > 0) {
    weaknesses.push(`Unverified resume claims (lacking GitHub proof): ${unverifiedClaims.join(', ')}`);
  }
  const missingSkills = resumeAnalysis?.core_match?.missing_skills || [];
  if (missingSkills.length > 0) {
    weaknesses.push(`Target role skill gaps identified: ${missingSkills.join(', ')}`);
  }

  // 8. Derive career domains via stub hook
  const careerDomains = deriveCareerDomains(resumeAnalysis, githubAnalysis);

  // 9. Extract user info safely from available metadata
  const user = {
    name: githubAnalysis?.name || resumeAnalysis?.candidate_name || 'Candidate',
    email: githubAnalysis?.email || resumeAnalysis?.user_email || '',
    title: resumeAnalysis?.job_title || 'Software Engineer'
  };

  // 10. Assemble and return Unified Profile containing complete original objects
  const profileData = {
    user,
    resume: resumeAnalysis,
    github: githubAnalysis,
    verifiedSkills,
    unverifiedClaims,
    resumeRecommendations,
    strengths,
    weaknesses,
    careerDomains,
    metadata: {
      createdAt: new Date().toISOString(),
      mergeStatus: 'SUCCESS'
    }
  };

  return createUnifiedProfile(profileData);
}

module.exports = {
  mergeProfile,
  createUnifiedProfile,
  deriveCareerDomains
};
