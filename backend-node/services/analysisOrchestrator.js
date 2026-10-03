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
  const lines = String(jobDescription).split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  const explicit = lines.find(line => /^(job\s*title|position|role)\s*[:\-]/i.test(line));
  if (explicit) {
    return explicit.replace(/^(job\s*title|position|role)\s*[:\-]\s*/i, '').replace(/\s+position$/i, '').trim();
  }

  const first = lines[0] || '';
  const firstSegment = first.split(',')[0].trim();
  if (
    firstSegment.length > 3 &&
    firstSegment.length < 80 &&
    /\b(developer|engineer|designer|analyst|scientist|intern|manager|architect|consultant|specialist|administrator|lead)\b/i.test(firstSegment)
  ) {
    return firstSegment.replace(/\s+position$/i, '').trim();
  }

  return first && first.length < 100 ? first.replace(/\s+position$/i, '').trim() : 'Position';
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

  // 7. Keep the roadmap synchronized with the master missing-skill list.
  // Never let an AI response erase deterministic gaps.
  if (aiResults.gaps) {
    const existing = aiResults.gaps;
    const deterministicGaps = candidateProfile.missingSkills || [];

    existing.skill_gaps = deterministicGaps.map(skill => {
      const aiGap = Array.isArray(existing.skill_gaps)
        ? existing.skill_gaps.find(g => String(g?.skill || '').toLowerCase() === String(skill).toLowerCase())
        : null;

      return {
        skill,
        priority: aiGap?.priority || 'High',
        estimated_time: aiGap?.estimated_time || '1-2 weeks',
        resources: aiGap?.resources?.length
          ? aiGap.resources
          : [{ name: `${skill} Official Documentation`, url: `https://www.google.com/search?q=${encodeURIComponent(skill + ' official documentation')}` }]
      };
    });

    if (deterministicGaps.length === 0) {
      existing.skill_gaps = [];
      existing.weekly_milestones = [];
      existing.portfolio_projects = [];
      existing.certifications = [];
    }

    existing.readiness_percentage = candidateProfile.jobSkills.length
      ? Math.round((candidateProfile.matchedSkills.length / candidateProfile.jobSkills.length) * 100)
      : 0;

    existing.gap_summary = deterministicGaps.length
      ? `Your resume currently evidences ${candidateProfile.matchedSkills.length} of ${candidateProfile.jobSkills.length} target skills. Focus next on ${deterministicGaps.slice(0, 4).join(', ')}.`
      : 'No major technology gaps were detected from the listed job requirements.';
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
      resumeRecommendations: mergedLegacyProfile.resumeRecommendations || [
        'Add measurable outcomes to your strongest projects, such as performance improvements, users served, accuracy achieved, or features implemented.',
        'Include direct GitHub repository links for your most relevant projects to make your technical experience easier to verify.'
      ],
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
