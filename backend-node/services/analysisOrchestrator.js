const { extractResumeText } = require('../resumeParser');
const { analyzeGithubProfile } = require('../githubAnalyzer');
const { mergeProfile } = require('./profileMerger');
const { runAllAnalyses } = require('../aiAnalyzer');
const { calculateTrustScore } = require('../trustScore');
const { findMatchesForCandidate } = require('../skillMatcher');
const { extractSkills, normalizeSkills, calculateAlignment, calculateAts } = require('./evidenceEngine');
const { buildCandidateProfile } = require('./matchingEngine');

function extractCandidateName(resumeText) {
  if (!resumeText) return 'Candidate';
  const firstLine = String(resumeText).split('\n')[0] || '';
  const value = firstLine.trim();
  return value.length < 50 && !/\d/.test(value) ? value : 'Candidate';
}

function extractJobTitle(jobDescription) {
  const lines = String(jobDescription || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const explicit = lines.find(line => /^(job\s*title|position|role)\s*[:\-]/i.test(line));
  if (explicit) return explicit.replace(/^(job\s*title|position|role)\s*[:\-]\s*/i, '').replace(/\s+position$/i, '').trim();
  const first = lines[0] || '';
  const segment = first.split(',')[0].trim();
  return segment.length >= 3 && segment.length < 80 ? segment.replace(/\s+position$/i, '').trim() : 'Position';
}

function detectResumeSections(resumeText) {
  const text = String(resumeText || '').toLowerCase();
  const sections = [];
  if (/\beducation\b|academic|degree/.test(text)) sections.push('Education');
  if (/\bskills?\b|technical skills|technologies|programming/.test(text)) sections.push('Skills');
  if (/\bprojects?\b|hackathon/.test(text)) sections.push('Projects');
  if (/\bexperience\b|internship|employment|work experience/.test(text)) sections.push('Experience');
  if (/certifications?|certificates?/.test(text)) sections.push('Certifications');
  if (/achievements?|awards?|honors?/.test(text)) sections.push('Achievements');
  return sections;
}

function buildDeterministicCore(resumeText, jobDescription) {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobDescription);
  const sections = detectResumeSections(resumeText);
  const alignment = calculateAlignment({ jobSkills, resumeSkills, sections });

  return {
    ...alignment,
    improvement_tips: alignment.missing_skills.length
      ? ['Address genuine gaps in ' + alignment.missing_skills.join(', ') + ' through hands-on work before claiming them on the resume.']
      : ['Keep the strongest project evidence visible and easy to verify.'],
    summary: jobSkills.length
      ? 'Deterministic matching found ' + alignment.matched_skills.length + ' of ' + jobSkills.length + ' recognized job-description skills in the resume. GitHub evidence is audited separately.'
      : 'No recognized technical skills were detected in the job description, so no technology match score was inferred.',
    source: 'deterministic'
  };
}

async function analyzeCandidate({ resumeBuffer, mimeType, jobDescription, githubUrl }) {
  const warnings = [];
  const errors = [];
  const resumeText = await extractResumeText(resumeBuffer, mimeType);

  if (typeof resumeText !== 'string' || !resumeText.trim()) {
    throw new Error('Failed to extract readable text from resume.');
  }
  if (!String(jobDescription || '').trim()) {
    throw new Error('Job description is required.');
  }

  let githubAnalysis = null;
  if (githubUrl && typeof githubUrl === 'string' && githubUrl.trim()) {
    const username = githubUrl.trim().split('/').filter(Boolean).pop();
    try {
      const result = await analyzeGithubProfile(githubUrl, []);
      if (result.error) {
        warnings.push('GitHub analysis notice: ' + result.error);
        githubAnalysis = { username, error: result.error, skills: [], repos: [], verifiedSkills: [] };
      } else {
        githubAnalysis = result;
        (result.warnings || []).forEach(w => warnings.push(w));
      }
    } catch (error) {
      warnings.push('GitHub API error: ' + error.message);
      githubAnalysis = { username, error: error.message, skills: [], repos: [], verifiedSkills: [] };
    }
  } else {
    warnings.push('No GitHub profile supplied; resume claims cannot be GitHub-verified.');
  }

  const candidateName = extractCandidateName(resumeText);
  const jobTitle = extractJobTitle(jobDescription);

  // AI is enrichment only. It no longer controls truth-sensitive matching.
  const aiResults = await runAllAnalyses(resumeText, jobDescription, candidateName, githubAnalysis);

  const rawResumeSkills = extractSkills(resumeText);
  const rawJobSkills = extractSkills(jobDescription);
  const rawGithubSkills = normalizeSkills(githubAnalysis?.skills || []);

  const candidateProfile = buildCandidateProfile({
    rawResumeSkills,
    rawGithubSkills,
    rawJobSkills,
    githubAnalysis,
    coreMatch: aiResults.core_match
  });

  const coreMatch = buildDeterministicCore(resumeText, jobDescription);
  const detectedSections = detectResumeSections(resumeText);
  const atsAnalysis = calculateAts({
    jobSkills: rawJobSkills,
    resumeSkills: rawResumeSkills,
    detectedSections
  });

  const deterministicGaps = candidateProfile.missingSkills;
  const aiGapMap = new Map(
    (aiResults.gaps?.skill_gaps || []).map(g => [String(g?.skill || '').toLowerCase(), g])
  );

  const skillGaps = deterministicGaps.map(skill => {
    return {
      skill,
      priority: 'Based on job-description gap',
      estimated_time: 'Varies by current proficiency',
      resources: [{ name: skill + ' official documentation' }]
    };
  });

  const skillGap = {
    ...(aiResults.gaps || {}),
    readiness_percentage: coreMatch.readiness_percentage,
    gap_summary: deterministicGaps.length
      ? 'Your resume directly evidences ' + coreMatch.matched_skills.length + ' of ' + rawJobSkills.length + ' recognized job skills. Missing: ' + deterministicGaps.join(', ') + '.'
      : 'No recognized technical skill gaps were found between the resume and the job description.',
    skill_gaps: skillGaps,
    weekly_milestones: deterministicGaps.slice(0, 4).map((skill, index) => ({
      week: index + 1,
      title: 'Learn and apply ' + skill,
      description: 'Build a small hands-on implementation of ' + skill + ' and document what you actually built.'
    })),
    milestones: deterministicGaps.slice(0, 4).map((skill, index) => ({
      week: index + 1,
      title: 'Learn and apply ' + skill,
      description: 'Build a small hands-on implementation of ' + skill + ' and document what you actually built.'
    }))
  };

  const trustAnalysis = calculateTrustScore(candidateProfile.resumeSkills, rawGithubSkills, {
    githubAnalysis
  });

  const skillSwapMatches = findMatchesForCandidate(
    candidateProfile.matchedSkills,
    candidateProfile.missingSkills,
    candidateName
  );

  const mergedLegacyProfile = mergeProfile(
    { core_match: coreMatch, resume_skills: rawResumeSkills, job_title: jobTitle, candidate_name: candidateName },
    githubAnalysis
  );

  return {
    candidateProfile: {
      ...candidateProfile,
      user: { name: candidateName, title: jobTitle },
      resumeRecommendations: mergedLegacyProfile.resumeRecommendations || []
    },
    githubAnalysis,
    atsAnalysis,
    trustAnalysis,
    skillGap,
    roadmap: skillGap,
    coverLetter: aiResults.cover_letter || {},
    interviewPrep: aiResults.interview_prep || {},
    skillSwap: {
      matches: skillSwapMatches,
      unlocked: trustAnalysis.unlocked,
      status: trustAnalysis.unlocked ? 'UNLOCKED' : 'LOCKED'
    },
    coreMatch,
    rewrites: aiResults.rewrites || { rewrites: [] },
    recommendations: mergedLegacyProfile.resumeRecommendations || [],
    metadata: {
      status: 'SUCCESS',
      confidence: 100,
      createdAt: new Date().toISOString(),
      jobTitle,
      candidateName,
      warnings,
      errors,
      verification: {
        matchingSource: 'deterministic',
        githubVerificationSource: 'repository evidence',
        aiRole: 'enrichment only'
      }
    }
  };
}

module.exports = { analyzeCandidate };
