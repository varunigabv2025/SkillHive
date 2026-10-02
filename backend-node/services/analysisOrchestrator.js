const { extractResumeText } = require('../resumeParser');
const { analyzeGithubProfile } = require('../githubAnalyzer');
const { mergeProfile } = require('./profileMerger');
const { runAllAnalyses } = require('../aiAnalyzer');
const { calculateTrustScore } = require('../trustScore');
const { findMatchesForCandidate } = require('../skillMatcher');
const { normalizeSkillList } = require('./skillNormalizationService');
const { buildCandidateProfile } = require('./matchingEngine');

function extractCandidateName(resumeText) {
  if (!resumeText) return 'Candidate';
  const lines = resumeText.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 50 && !/\d/.test(firstLine)) {
      return firstLine;
    }
  }
  return 'Candidate';
}

function extractJobTitle(jobDescription) {
  if (!jobDescription) return 'Position';
  const lines = jobDescription.split('\n');
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !/^we are|^we're|^about the|^job/i.test(line)) {
      if (line.length < 100) {
        return line;
      }
    }
  }
  return 'Position';
}

async function analyzeCandidate({ resumeBuffer, mimeType, jobDescription, githubUrl }) {
  const warnings = [];
  const errors = [];
  let status = 'SUCCESS';
  let confidence = 95;

  // 1. Resume Text Extraction
  const resumeText = await extractResumeText(resumeBuffer, mimeType);
  if (typeof resumeText !== 'string' || !resumeText.trim()) {
    throw new Error('Failed to extract readable text from resume.');
  }

  // 2. GitHub Evidence Extraction
  let githubAnalysis = null;
  if (githubUrl && typeof githubUrl === 'string' && githubUrl.trim()) {
    const username = githubUrl.trim().split('/').filter(Boolean).pop();
    if (username) {
      try {
        const ghResult = await analyzeGithubProfile(githubUrl, []);
        if (ghResult.error) {
          warnings.push(`GitHub analysis notice: ${ghResult.error}`);
          githubAnalysis = { username, error: ghResult.error, skills: [], repos: [], verifiedSkills: [] };
        } else {
          githubAnalysis = ghResult;
          (ghResult.warnings || []).forEach(w => warnings.push(w));
        }
      } catch (ghErr) {
        warnings.push(`GitHub API error: ${ghErr.message}`);
        githubAnalysis = { username, error: ghErr.message, skills: [], repos: [], verifiedSkills: [] };
      }
    }
  }

  const candidateName = extractCandidateName(resumeText);
  const jobTitle = extractJobTitle(jobDescription);

  // 3. AI Analysis Suite
  const aiResults = await runAllAnalyses(resumeText, jobDescription, candidateName, githubAnalysis);

  // Extract raw skills from data sources
  const rawResumeSkills = aiResults.core_match?.matched_skills || [];
  const rawJobSkills = [...(aiResults.core_match?.matched_skills || []), ...(aiResults.core_match?.missing_skills || [])];
  const rawGithubSkills = githubAnalysis?.skills || [];

  // 4. Master Candidate Profile Construction (Single Source of Truth)
  const candidateProfile = buildCandidateProfile({
    rawResumeSkills,
    rawGithubSkills,
    rawJobSkills,
    githubAnalysis,
    coreMatch: aiResults.core_match,
    atsAnalysis: aiResults.ats
  });

  // Ensure Core Match & ATS use normalized master skills
  aiResults.core_match.matched_skills = candidateProfile.matchedSkills;
  aiResults.core_match.missing_skills = candidateProfile.missingSkills;
  aiResults.ats.keyword_density = {
    high_match: candidateProfile.matchedSkills,
    partial_match: candidateProfile.partiallyMatchedSkills,
    missing: candidateProfile.missingSkills
  };

  // 5. Unified Trust Score Calculation (FIRED WITH VALID rawGithubSkills SOURCE)
  const trustAnalysis = calculateTrustScore(candidateProfile.matchedSkills, rawGithubSkills, {
    githubAnalysis,
    overallScore: aiResults.core_match?.overall_score,
    atsScore: aiResults.ats?.ats_score
  });

  // 6. SkillSwap Engine
  const skillSwapMatches = findMatchesForCandidate(candidateProfile.matchedSkills, candidateProfile.missingSkills, candidateName);

  // 7. Ensure Roadmap recommends ONLY genuine missingSkills
  if (aiResults.gaps && Array.isArray(aiResults.gaps.skill_gaps)) {
    aiResults.gaps.skill_gaps = candidateProfile.missingSkills.map(skill => ({
      skill,
      priority: 'High',
      estimated_time: '2 weeks',
      resources: [
        { name: `${skill} Official Guides`, url: `https://google.com/search?q=${encodeURIComponent(skill + ' documentation')}` }
      ]
    }));
  }

  const mergedLegacyProfile = mergeProfile(aiResults, githubAnalysis);

  // Debug Logging
  console.log('[DEBUG Orchestrator] GitHub Username:', githubAnalysis?.username);
  console.log('[DEBUG Orchestrator] Repository Count:', githubAnalysis?.repoCount);
  console.log('[DEBUG Orchestrator] Repository Names:', githubAnalysis?.repos?.map(r => r.name));
  console.log('[DEBUG Orchestrator] GitHub Extracted Skills:', rawGithubSkills);
  console.log('[DEBUG Orchestrator] Resume Extracted Skills:', rawResumeSkills);
  console.log('[DEBUG Orchestrator] Matched Skills:', candidateProfile.matchedSkills);
  console.log('[DEBUG Orchestrator] Missing Skills:', candidateProfile.missingSkills);
  console.log('[DEBUG Orchestrator] Verified Skills:', candidateProfile.verifiedSkills);
  console.log('[DEBUG Orchestrator] Trust Score Inputs:', { matched: candidateProfile.matchedSkills, github: rawGithubSkills });

  // Return Master CandidateProfile Response Object
  return {
    candidateProfile: {
      ...candidateProfile,
      user: { name: candidateName, title: jobTitle }
    },
    githubAnalysis,
    atsAnalysis: aiResults.ats || {},
    trustAnalysis,
    skillGap: aiResults.gaps || {},
    roadmap: aiResults.gaps || {},
    coverLetter: aiResults.cover_letter || {},
    interviewPrep: aiResults.interview_prep || {},
    skillSwap: {
      matches: skillSwapMatches,
      unlocked: trustAnalysis.unlocked,
      status: trustAnalysis.unlocked ? 'UNLOCKED' : 'LOCKED'
    },
    coreMatch: aiResults.core_match || {},
    rewrites: aiResults.rewrites || { rewrites: [] },
    recommendations: mergedLegacyProfile.resumeRecommendations || [],
    metadata: {
      status,
      confidence,
      createdAt: new Date().toISOString(),
      jobTitle,
      candidateName,
      warnings,
      errors
    }
  };
}

module.exports = {
  analyzeCandidate
};
