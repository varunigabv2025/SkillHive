/**
 * Frontend Profile Merger Utility (SkillBridge AI)
 * 
 * Aggregates ATS resume analysis and GitHub code evidence into a single, unified candidate profile.
 */

export function verifySkillWithGithubEvidence(skill, githubAnalysis) {
  if (!githubAnalysis || githubAnalysis.error) {
    return { verified: false, evidence: null };
  }

  const s = String(skill || '').trim().toLowerCase();
  if (!s) return { verified: false, evidence: null };

  const languages = (githubAnalysis.languages || []).map(l => String(l).toLowerCase());
  const skills = (githubAnalysis.skills || []).map(sk => String(sk).toLowerCase());
  const repoNames = (githubAnalysis.repos || []).map(r => String(r.name || '').toLowerCase());
  const repoDescs = (githubAnalysis.repos || []).map(r => String(r.description || '').toLowerCase());

  const TECH_ALIASES = {
    'react': ['react', 'reactjs', 'react.js', 'jsx', 'tsx', 'next', 'next.js', 'nextjs'],
    'react.js': ['react', 'reactjs', 'react.js', 'jsx', 'tsx', 'next', 'next.js', 'nextjs'],
    'node.js': ['node', 'nodejs', 'node.js', 'express', 'expressjs', 'javascript', 'typescript'],
    'node': ['node', 'nodejs', 'node.js', 'express', 'expressjs', 'javascript', 'typescript'],
    'express': ['express', 'expressjs', 'express.js', 'node', 'nodejs'],
    'express.js': ['express', 'expressjs', 'express.js', 'node', 'nodejs'],
    'javascript': ['javascript', 'js', 'es6', 'typescript', 'ts'],
    'typescript': ['typescript', 'ts'],
    'python': ['python', 'py', 'django', 'flask', 'fastapi'],
    'java': ['java', 'spring', 'springboot'],
    'postgresql': ['postgres', 'postgresql', 'psql'],
    'postgres': ['postgres', 'postgresql', 'psql'],
    'mongodb': ['mongo', 'mongodb', 'mongoose'],
    'docker': ['docker', 'dockerfile', 'container'],
    'ci/cd': ['ci/cd', 'github actions', 'action', 'ci', 'workflow'],
    'git': ['git', 'github']
  };

  const targets = TECH_ALIASES[s] || [s];

  // 1. Direct language match
  for (const lang of languages) {
    for (const t of targets) {
      if (lang === t || lang.includes(t)) {
        return { verified: true, evidence: `Verified in GitHub repository languages (${lang.toUpperCase()})` };
      }
    }
  }

  // 2. Direct topic/skill match
  for (const sk of skills) {
    for (const t of targets) {
      if (sk === t || sk.includes(t) || t.includes(sk)) {
        return { verified: true, evidence: `Verified in GitHub repository topics (${sk})` };
      }
    }
  }

  // 3. Repo name match
  for (const repo of repoNames) {
    for (const t of targets) {
      if (repo.includes(t)) {
        return { verified: true, evidence: `Code evidence found in repository "${repo}"` };
      }
    }
  }

  // 4. Repo description match
  for (const desc of repoDescs) {
    for (const t of targets) {
      if (desc.includes(t)) {
        return { verified: true, evidence: `Code evidence documented in repository description` };
      }
    }
  }

  // 5. Special flags
  if ((s === 'docker' || s === 'containers') && githubAnalysis.hasDocker) {
    return { verified: true, evidence: 'Verified via Dockerfile inspection in GitHub repositories' };
  }

  if ((s === 'ci/cd' || s === 'devops' || s === 'github actions') && githubAnalysis.hasCI) {
    return { verified: true, evidence: 'Verified via .github/workflows CI/CD configuration' };
  }

  if (s === 'git' && (githubAnalysis.repoCount > 0 || githubAnalysis.username)) {
    return { verified: true, evidence: `Verified via active GitHub profile (@${githubAnalysis.username})` };
  }

  return { verified: false, evidence: null };
}

export function deriveCareerDomains(resumeAnalysis, githubAnalysis) {
  const domains = new Set();
  const languages = githubAnalysis?.languages || [];
  const skills = resumeAnalysis?.core_match?.matched_skills || [];

  if (skills.some(s => /react|vue|angular|html|css|tailwind/i.test(s))) domains.add('Frontend Engineering');
  if (skills.some(s => /node|express|python|java|postgres|mongo/i.test(s))) domains.add('Backend Systems');
  if (skills.some(s => /docker|kubernetes|aws|ci\/cd|devops/i.test(s))) domains.add('DevOps & Cloud');

  return [...domains];
}

export function createUnifiedProfile(data = {}) {
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

export function mergeProfile(resumeAnalysis = {}, githubAnalysis = {}) {
  const resumeSkills = resumeAnalysis?.core_match?.matched_skills || 
                       resumeAnalysis?.matched_skills || 
                       [];

  const githubSkills = githubAnalysis?.skills || [];

  const verifiedSkills = [];
  const unverifiedClaims = [];

  resumeSkills.forEach(skill => {
    const check = verifySkillWithGithubEvidence(skill, githubAnalysis);
    if (check.verified) {
      verifiedSkills.push({
        skill: skill,
        evidence: check.evidence || 'Found in GitHub repositories'
      });
    } else {
      unverifiedClaims.push(skill);
    }
  });

  // Generate actionable resume recommendations.
  const resumeRecommendations = [];

  // 1. Unverified resume claims need stronger evidence.
  unverifiedClaims.forEach(skill => {
    resumeRecommendations.push(
      `Strengthen the evidence for ${skill} by adding a relevant project, repository, contribution, or measurable experience if you have one.`
    );
  });

  // 2. GitHub-proven skills that are missing from the resume.
  githubSkills
    .filter(
      skill =>
        !resumeSkills.some(
          rs => rs.toLowerCase() === skill.toLowerCase()
        )
    )
    .forEach(skill => {
      resumeRecommendations.push(
        `Consider adding ${skill} to your resume because it is supported by your GitHub activity.`
      );
    });

  // 3. If there are no automatic recommendations, give a useful fallback.
  if (resumeRecommendations.length === 0) {
    resumeRecommendations.push(
      'Add measurable outcomes to your strongest projects, such as performance improvements, users served, accuracy achieved, or features implemented.'
    );
    resumeRecommendations.push(
      'Include direct GitHub repository links for your most relevant projects to make your technical experience easier to verify.'
    );
  }
  const strengths = [];
  if (verifiedSkills.length > 0) {
    const verifiedNames = verifiedSkills.map(v => v.skill).join(', ');
    strengths.push(`Practical code proof on GitHub for verified skills: ${verifiedNames}`);
  }
  const overallScore = resumeAnalysis?.core_match?.overall_score || resumeAnalysis?.overall_score;
  if (typeof overallScore === 'number' && overallScore >= 75) {
    strengths.push(`Strong resume alignment with an overall score of ${overallScore}%`);
  }

  const weaknesses = [];
  if (unverifiedClaims.length > 0) {
    weaknesses.push(`Unverified resume claims (lacking GitHub proof): ${unverifiedClaims.join(', ')}`);
  }

  const careerDomains = deriveCareerDomains(resumeAnalysis, githubAnalysis);

  const user = {
    name: githubAnalysis?.username || resumeAnalysis?.candidate_name || 'Candidate',
    email: '',
    title: resumeAnalysis?.job_title || 'Software Engineer'
  };

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
