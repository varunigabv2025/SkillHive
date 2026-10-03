require('dotenv').config();
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
const AI_MODEL = process.env.AI_MODEL || 'google/gemma-3-27b-it';

const TECH_KEYWORDS = [
  'React', 'Node.js', 'Express', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'GraphQL', 'REST API', 'Git', 'CI/CD', 'Tailwind', 'HTML', 'CSS', 'Linux',
  'Unit Testing', 'Jest', 'System Design', 'Microservices', 'Agile'
];

function detectSections(resumeText) {
  if (!resumeText) return [];
  const text = resumeText.toLowerCase();
  const sections = [];

  if (text.includes("education") || text.includes("academic") || text.includes("degree")) sections.push("Education");
  if (text.includes("skills") || text.includes("technical skills") || text.includes("technologies") || text.includes("programming")) sections.push("Skills");
  if (text.includes("projects") || text.includes("project") || text.includes("hackathon")) sections.push("Projects");
  if (text.includes("experience") || text.includes("internship") || text.includes("employment") || text.includes("work experience")) sections.push("Experience");
  if (text.includes("certification") || text.includes("certifications") || text.includes("certificate")) sections.push("Certifications");
  if (text.includes("achievement") || text.includes("achievements") || text.includes("award") || text.includes("honor")) sections.push("Achievements");

  return [...new Set(sections)];
}

function extractKeywords(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return TECH_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));
}

function fallbackCoreMatch(resumeText, jobDescription) {
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);

  const matched = jdKeywords.length > 0
    ? jdKeywords.filter(k => resumeKeywords.map(r => r.toLowerCase()).includes(k.toLowerCase()))
    : resumeKeywords;

  const missing = jdKeywords.filter(k => !matched.map(m => m.toLowerCase()).includes(k.toLowerCase()));

  const matchedSet = new Set(matched);
  const matchedSkills = [...matchedSet];
  const missingSkills = [...new Set(missing)];

  const skillsScore = Math.min(100, Math.max(35, Math.round((matchedSkills.length / Math.max(1, jdKeywords.length)) * 100)));
  const experienceScore = Math.min(100, Math.max(40, skillsScore + 5));
  const educationScore = detectSections(resumeText).includes("Education") ? 85 : 50;
  const keywordsScore = skillsScore;

  const overallScore = Math.round((skillsScore * 0.4) + (experienceScore * 0.3) + (educationScore * 0.15) + (keywordsScore * 0.15));

  return {
    overall_score: overallScore,
    section_scores: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      keywords: keywordsScore
    },
    matched_skills: matchedSkills.length > 0 ? matchedSkills : ["JavaScript", "Git", "REST API"],
    missing_skills: missingSkills.length > 0 ? missingSkills : ["Docker", "AWS", "Kubernetes"],
    improvement_tips: [
      `Quantify impact in bullet points using metrics and numbers.`,
      `Incorporate missing target keywords (${missingSkills.slice(0, 3).join(', ') || 'Docker, AWS'}) into your experience section.`
    ],
    keyword_gaps: missingSkills,
    summary: `Candidate resume analyzed against target job requirements. Found ${matchedSkills.length} matching core technologies and ${missingSkills.length} key skill gaps.`
  };
}

function fallbackATS(resumeText, jobDescription) {
  const detected = detectSections(resumeText);
  const expected = ["Education", "Skills", "Projects", "Experience", "Certifications", "Achievements"];
  const missing = expected.filter(s => !detected.includes(s));
  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);

  const highMatch = jdKeywords.filter(k => resumeKeywords.map(r => r.toLowerCase()).includes(k.toLowerCase()));
  const missingKw = jdKeywords.filter(k => !highMatch.map(h => h.toLowerCase()).includes(k.toLowerCase()));

  const score = Math.min(98, Math.max(40, Math.round((detected.length / 6) * 40 + (highMatch.length / Math.max(1, jdKeywords.length)) * 60)));

  return {
    ats_score: score,
    parsing_issues: missing.length > 0 ? [`Missing standard sections: ${missing.join(', ')}`] : [],
    detected_sections: detected.length > 0 ? detected : ["Education", "Skills", "Experience"],
    missing_sections: missing,
    keyword_density: {
      high_match: highMatch.length > 0 ? highMatch : ["JavaScript", "Git"],
      partial_match: ["REST API", "Agile"],
      missing: missingKw.length > 0 ? missingKw : ["Docker", "Kubernetes"]
    },
    formatting_warnings: [],
    ats_verdict: score >= 75 ? "Pass - High ATS Compatibility" : "Conditional Pass - Optimization Recommended"
  };
}

function fallbackRewrites(resumeText) {
  const lines = (resumeText || '').split('\n').map(l => l.trim()).filter(l => l.length > 25 && !l.toLowerCase().includes('education'));
  const sampleLines = lines.slice(0, 4);

  const rewrites = sampleLines.map((line, idx) => ({
    original: line,
    improved: `Engineered scalable solution: ${line.replace(/^[-•*]\s*/, '')} achieving 35% efficiency boost and improved system reliability.`,
    reason: "Enhanced impact phrasing with measurable metrics and active voice verbs.",
    confidence: 100 - (idx * 2)
  }));

  if (rewrites.length === 0) {
    rewrites.push({
      original: "Developed web application using modern JavaScript frameworks.",
      improved: "Architected and delivered high-performance web application utilizing modern JavaScript frameworks, optimizing load latency by 40%.",
      reason: "Added active verb, specific tech context, and performance metric.",
      confidence: 100
    });
  }

  return { rewrites };
}

function fallbackGaps(resumeText, jobDescription) {
  const core = fallbackCoreMatch(resumeText, jobDescription);
  const missing = core.missing_skills;

  const skillGaps = missing.map(skill => ({
    skill,
    priority: "High",
    estimated_time: "2 - 3 weeks",
    resources: [
      { name: `${skill} Official Documentation & Guides`, url: `https://google.com/search?q=${encodeURIComponent(skill + ' documentation')}` },
      { name: `Mastering ${skill} Hands-on Course`, url: `https://coursera.org/search?query=${encodeURIComponent(skill)}` }
    ]
  }));

  const readiness = Math.max(30, 100 - (missing.length * 10));

  return {
    readiness_percentage: readiness,
    gap_summary: `Identified ${missing.length} skill gaps required for target position readiness.`,
    skill_gaps: skillGaps,
    weekly_milestones: [
      { week: 1, title: "Foundations & Syntax", description: `Master syntax and core concepts of ${missing[0] || 'target tech'}.` },
      { week: 2, title: "Architecture & Integration", description: `Build small services integrating ${missing[0] || 'target tech'} with existing stack.` },
      { week: 3, title: "System Design & Testing", description: `Implement comprehensive unit tests and optimize system performance.` },
      { week: 4, title: "Production Deployment", description: `Deploy full-stack project to cloud environment with CI/CD pipeline.` }
    ],
    certifications: [
      { name: `Certified ${missing[0] || 'Cloud'} Developer`, provider: "AWS / Industry Accredited" },
      { name: `Professional ${missing[1] || 'DevOps'} Specialist`, provider: "Linux Foundation" }
    ],
    portfolio_projects: [
      { title: `Full-Stack ${missing[0] || 'Cloud'} Microservice`, description: `Build a resilient microservice architecture utilizing ${missing.join(' and ')}.`, tech_stack: missing },
      { title: `Real-time Analytics Dashboard`, description: `Implement dynamic metrics telemetry with high-throughput streaming.`, tech_stack: [missing[0] || 'Node.js', 'WebSockets'] }
    ],
    timeline: "4 - 6 Weeks Dedicated Upskilling",
    milestones: [
      { label: "Core Foundation & Syntax", percentage: 25 },
      { label: "Hands-on Project Building", percentage: 50 },
      { label: "Advanced System Design Integration", percentage: 75 },
      { label: "Production Deployment & Mastery", percentage: 100 }
    ]
  };
}

function extractJobTitle(jobDescription = "") {
  const text = String(jobDescription || "").trim();
  if (!text) return "the position";

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  const explicit = lines.find(line => /^(job\s*title|position|role)\s*[:\-]/i.test(line));
  if (explicit) {
    const title = explicit.replace(/^(job\s*title|position|role)\s*[:\-]\s*/i, "").trim();
    if (title) return title.replace(/\s+position$/i, "").trim();
  }

  const labeled = lines.find(line => /\b(job\s*title|position|role)\b/i.test(line) && line.length < 120);
  if (labeled) {
    const title = labeled.replace(/^(job\s*title|position|role)\s*[:\-]?\s*/i, "").trim();
    if (title && !/^the position$/i.test(title)) return title.replace(/\s+position$/i, "").trim();
  }

  const first = lines[0] || "";

  // Job postings often put the role followed by a comma-separated
  // requirements tagline, e.g. "WEB DEVELOPER, WELL VERSED IN REACT...".
  const firstSegment = first.split(",")[0].trim();
  if (
    firstSegment.length > 3 &&
    firstSegment.length < 60 &&
    /\b(developer|engineer|designer|analyst|scientist|intern|manager|architect|consultant|specialist|administrator|lead)\b/i.test(firstSegment)
  ) {
    return firstSegment.replace(/\s+position$/i, "").trim();
  }

  if (first.length > 3 && first.length < 80 && !/^(job description|about the role|responsibilities|requirements)$/i.test(first)) {
    return first.replace(/\s+position$/i, "").trim();
  }

  return "the position";
}

function extractResumeProjects(resumeText = "") {
  const text = String(resumeText || "");
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  const start = lines.findIndex(line => /^(projects?|academic projects?|personal projects?)\s*:?$/i.test(line));
  if (start === -1) return [];

  const stopPattern = /^(experience|education|skills?|certifications?|achievements?|languages?|interests?|references?|contact|summary|objective)\s*:?$/i;
  const projects = [];

  for (let i = start + 1; i < Math.min(lines.length, start + 45); i++) {
    if (stopPattern.test(lines[i])) break;

    const line = lines[i];
    if (line.length < 4) continue;

    // Project headings are usually short and do not end with sentence punctuation.
    if (
      line.length <= 90 &&
      !/[.!?]$/.test(line) &&
      !/^https?:\/\//i.test(line) &&
      !/^(developed|built|created|implemented|designed|used|worked|responsible|integrated|deployed|implemented)\b/i.test(line)
    ) {
      projects.push({
        title: line.replace(/\s*[|–—-]\s*.*$/, "").trim(),
        details: lines.slice(i + 1, Math.min(i + 4, lines.length))
          .filter(x => !stopPattern.test(x))
          .join(" ")
          .slice(0, 280)
      });
      if (projects.length >= 3) break;
    }
  }

  // Fallback for resumes whose project headings are not clearly separated.
  if (projects.length === 0) {
    const projectLines = [];
    for (let i = start + 1; i < Math.min(lines.length, start + 30); i++) {
      if (stopPattern.test(lines[i])) break;
      if (lines[i].length >= 4) projectLines.push(lines[i]);
    }
    return projectLines.slice(0, 3).map(line => ({ title: line.slice(0, 90), details: line }));
  }

  return projects;
}function fallbackCoverLetter(resumeText, jobDescription, candidateName = "Candidate", githubAnalysis = null) {
  const core = fallbackCoreMatch(resumeText, jobDescription);
  const highlights = (core.matched_skills || []).slice(0, 4);
  const jobTitle = extractJobTitle(jobDescription);
  const projects = extractResumeProjects(resumeText);

  const projectOne = projects[0];
  const projectTwo = projects[1];

  const skillPhrase = highlights.length
    ? highlights.slice(0, 3).join(", ")
    : "the technical skills demonstrated in my projects";

  const projectParagraph = projectOne
    ? `A strong example is my ${projectOne.title} project${projectOne.details ? `, where I ${projectOne.details.charAt(0).toLowerCase() + projectOne.details.slice(1)}` : ""}. This experience gave me practical exposure to ${skillPhrase} and to building a complete solution rather than only working with individual technologies.`
    : `My academic and project work has given me practical experience applying ${skillPhrase} to build working software and solve concrete technical problems.`;

  const secondParagraph = projectTwo
    ? `I have also worked on ${projectTwo.title}${projectTwo.details ? `, involving ${projectTwo.details.charAt(0).toLowerCase() + projectTwo.details.slice(1)}` : ""}. These projects have strengthened my ability to understand requirements, implement features, and work across different parts of a software system.`
    : `My broader project work has also required me to connect frontend development, backend logic, APIs, and data handling, giving me experience working through a feature from implementation to completion.`;

  const githubSentence = githubAnalysis?.username
    ? ` My GitHub profile (@${githubAnalysis.username}) also provides public evidence of this hands-on work.`
    : "";

  return {
    subject_line: `Application for ${jobTitle}`,
    cover_letter: `Dear Hiring Manager,

The ${jobTitle} opportunity interests me because it combines the kind of software development work I have been building through my academic and personal projects. My background includes hands-on work with ${skillPhrase}, with a focus on turning requirements into functional applications.

${projectParagraph}

${secondParagraph}${githubSentence}

I would value the opportunity to bring this project-based experience to your team while continuing to develop the skills required for the role. Thank you for considering my application. I would be glad to discuss the projects and technical decisions behind my work.

Sincerely,
${candidateName}`,
    highlights_used: highlights,
    tone: "Professional & Tailored"
  };
}
