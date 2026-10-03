require('dotenv').config();
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
const AI_MODEL = process.env.AI_MODEL || 'google/gemma-3-27b-it';

const TECH_KEYWORDS = [
  'React', 'React Native', 'Next.js', 'Node.js', 'Express', 'JavaScript', 'TypeScript',
  'Python', 'Java', 'C++', 'C', 'R', 'MATLAB',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'Linux',
  'GraphQL', 'REST API', 'Git', 'GitHub Actions',
  'Tailwind CSS', 'HTML5', 'CSS3', 'Jest', 'Unit Testing',
  'PyTorch', 'TensorFlow', 'Scikit-learn', 'Pandas', 'NumPy', 'OpenCV',
  'Machine Learning', 'Deep Learning', 'NLP', 'Natural Language Processing',
  'LLM', 'Generative AI', 'Computer Vision', 'Data Science',
  'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Microservices',
  'System Design', 'Agile', 'JWT', 'WebSockets'
];

async function callAI(systemPrompt, userPrompt) {
  const payload = {
    model: AI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  if (OPENROUTER_API_KEY) {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://skill-hive-green.vercel.app",
          "X-Title": "SkillBridge AI"
        },
        timeout: 30000
      }
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned no content");
    return typeof content === "string" ? JSON.parse(content) : content;
  }

  if (GOOGLE_API_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;
    const response = await axios.post(
      url,
      {
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      },
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );
    const content = response.data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("");
    if (!content) throw new Error("Google AI returned no content");
    return JSON.parse(content.replace(/^\s*```json\s*/i, "").replace(/\s*```\s*$/i, "").trim());
  }

  throw new Error("No AI API key configured");
}

function extractJobTitle(jobDescription) {
  if (!jobDescription) return "Position";
  const lines = String(jobDescription).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const explicit = lines.find(line => /^(job\s*title|position|role)\s*[:\-]/i.test(line));
  if (explicit) return explicit.replace(/^(job\s*title|position|role)\s*[:\-]\s*/i, "").trim();

  const first = lines[0] || "";
  const segment = first.split(",")[0].trim();
  return segment.length >= 3 && segment.length <= 80 ? segment.replace(/\s+position$/i, "") : "Position";
}

function extractResumeProjects(resumeText) {
  const lines = String(resumeText || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const projects = [];
  let inProjects = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(projects?|academic projects?|personal projects?)\s*:?$/i.test(line)) {
      inProjects = true;
      continue;
    }
    if (inProjects && /^(education|experience|work experience|skills|certifications?|achievements?|awards?)\s*:?$/i.test(line)) {
      break;
    }
    if (inProjects && line.length >= 3 && line.length <= 100 && !/^[-•*]/.test(line)) {
      const next = [];
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (/^[-•*]/.test(lines[j]) || lines[j].length > 100) next.push(lines[j].replace(/^[-•*]\s*/, ""));
      }
      projects.push({ title: line, details: next.slice(0, 2).join(" ") });
      if (projects.length >= 5) break;
    }
  }

  return projects;
}

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
  const source = String(text).toLowerCase();

  const aliases = {
    'react': ['react', 'reactjs', 'react.js'],
    'react native': ['react native'],
    'next.js': ['next.js', 'nextjs', 'next'],
    'node.js': ['node.js', 'nodejs', 'node'],
    'express': ['express', 'expressjs', 'express.js'],
    'javascript': ['javascript', 'js', 'ecmascript'],
    'typescript': ['typescript', 'ts'],
    'html5': ['html5', 'html'],
    'css3': ['css3', 'css'],
    'tailwind css': ['tailwind css', 'tailwindcss', 'tailwind'],
    'sql': ['sql'],
    'mysql': ['mysql'],
    'postgresql': ['postgresql', 'postgres', 'psql'],
    'mongodb': ['mongodb', 'mongo'],
    'rest api': ['rest api', 'rest apis', 'restful api', 'restful apis', 'restful'],
    'ci/cd': ['ci/cd', 'cicd', 'github actions'],
    'pytorch': ['pytorch', 'torch'],
    'tensorflow': ['tensorflow'],
    'scikit-learn': ['scikit-learn', 'scikit learn', 'sklearn'],
    'pandas': ['pandas'],
    'numpy': ['numpy'],
    'nlp': ['nlp', 'natural language processing'],
    'machine learning': ['machine learning', 'ml'],
    'deep learning': ['deep learning'],
    'computer vision': ['computer vision'],
    'generative ai': ['generative ai', 'genai'],
    'llm': ['llm', 'large language model', 'large language models'],
    'jwt': ['jwt', 'json web token', 'json web tokens']
  };

  const found = [];
  for (const keyword of TECH_KEYWORDS) {
    const candidates = aliases[keyword.toLowerCase()] || [keyword.toLowerCase()];
    const hit = candidates.some(alias => {
      const escaped = alias.replace(/[.*+?^$\\{}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^a-z0-9+#.-])' + escaped + '([^a-z0-9+#.-]|$)', 'i').test(source);
    });
    if (hit) found.push(keyword);
  }
  return [...new Set(found)];
}

function fallbackCoreMatch(resumeText, jobDescription) {
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);

  const resumeLower = resumeKeywords.map(r => r.toLowerCase());
  const matched = jdKeywords.filter(k => resumeLower.includes(k.toLowerCase()));
  const missing = jdKeywords.filter(k => !matched.map(m => m.toLowerCase()).includes(k.toLowerCase()));

  const matchedSkills = [...new Set(matched)];
  const missingSkills = [...new Set(missing)];

  const skillsScore = jdKeywords.length
    ? Math.round((matchedSkills.length / jdKeywords.length) * 100)
    : 0;
  const experienceScore = Math.min(100, Math.max(40, skillsScore));
  const educationScore = detectSections(resumeText).includes("Education") ? 85 : 50;
  const keywordsScore = skillsScore;
  const overallScore = Math.round(
    (skillsScore * 0.4) + (experienceScore * 0.3) + (educationScore * 0.15) + (keywordsScore * 0.15)
  );

  const matchedText = matchedSkills.length
    ? matchedSkills.join(", ")
    : "no directly matched core technologies";
  const missingText = missingSkills.length
    ? missingSkills.join(", ")
    : "no major keyword gaps";

  return {
    overall_score: overallScore,
    section_scores: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      keywords: keywordsScore
    },
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    improvement_tips: [
      matchedSkills.length
        ? `Make your ${matchedText} experience more visible by connecting each skill to a specific project or implementation.`
        : "Add the target role's relevant technologies only where you genuinely have hands-on experience.",
      missingSkills.length
        ? `Address the current gaps in ${missingText} through relevant projects or learning before claiming them on the resume.`
        : "Keep your strongest project evidence prominent and easy to verify."
    ],
    keyword_gaps: missingSkills,
    summary: `The resume matches ${matchedText} from the target job description and currently shows ${missingText}. The main opportunity is to make the strongest evidence easier to verify without adding unsupported claims.`
  };
}

async function analyzeCoreMatch(resumeText, jobDescription) {
  try {
    const result = await callAI(
      'Compare the resume with the job description. Return ONLY JSON with overall_score, section_scores {skills,experience,education,keywords}, matched_skills, missing_skills, improvement_tips, keyword_gaps, summary. Scores must be integers from 0 to 100. Never invent resume facts.',
      `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`
    );
    if (!result || !result.section_scores || !Array.isArray(result.matched_skills) || !Array.isArray(result.missing_skills)) {
      throw new Error('Invalid core match response');
    }
    return result;
  } catch (error) {
    return fallbackCoreMatch(resumeText, jobDescription);
  }
}

async function simulateATS(resumeText, jobDescription) {
  try {
    const result = await callAI(
      'Act as an ATS scanner. Return ONLY JSON with ats_score, parsing_issues, detected_sections, missing_sections, keyword_density {high_match,partial_match,missing}, formatting_warnings, ats_verdict. Never invent sections.',
      `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`
    );
    result.detected_sections = detectSections(resumeText);
    return result;
  } catch (error) {
    return fallbackATS(resumeText, jobDescription);
  }
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
      high_match: highMatch,
      partial_match: [],
      missing: missingKw
    },
    formatting_warnings: [],
    ats_verdict: score >= 75 ? "Pass - High ATS Compatibility" : "Conditional Pass - Optimization Recommended"
  };
}

function fallbackRewrites(resumeText) {
  const rawLines = String(resumeText || "").split(/\r?\n/);
  const sectionPattern = /^(education|skills?|technical skills|projects?|experience|work experience|internship|certifications?|achievements?|awards?|summary|objective|contact|interests?|languages?|references?)\s*:?$/i;
  const contactPattern = /(@|https?:\/\/|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,})/i;
  const educationPattern = /\b(b\.?tech|bachelor|m\.?tech|master|degree|university|college|cgpa|gpa)\b/i;

  const candidates = rawLines
    .map(line => line.trim())
    .filter(line => {
      const clean = line.replace(/^[-•*]\s*/, "").trim();
      if (clean.length < 35 || clean.length > 320) return false;
      if (sectionPattern.test(clean) || contactPattern.test(clean) || educationPattern.test(clean)) return false;
      return /^[-•*]/.test(line) ||
        /^(developed|built|created|implemented|designed|engineered|integrated|deployed|automated|configured|optimized|analyzed|led|used|worked on|contributed)\b/i.test(clean);
    })
    .slice(0, 5)
    .map(line => line.replace(/^[-•*]\s*/, "").trim());

  const rewriteOne = (original) => {
    let improved = original;

    const transformations = [
      [/^Developed\s+(?:an?|the)\s+(.+?)\s+that\s+(.+)$/i, "Built $1 that $2"],
      [/^Created\s+(?:an?|the)\s+(.+?)\s+for\s+(.+)$/i, "Built $1 for $2"],
      [/^Implemented\s+(.+?)\s+to\s+calculate\s+(.+)$/i, "Applied $1 to measure $2"],
      [/^Implemented\s+(.+?)\s+to\s+(.+)$/i, "Applied $1 to $2"],
      [/^Built\s+(?:an?|the)\s+(.+?)\s+for\s+displaying\s+(.+)$/i, "Created $1 that displays $2"],
      [/^Built\s+(?:an?|the)\s+(.+?)\s+using\s+(.+)$/i, "Developed $1 with $2"],
      [/^Used\s+(.+?)\s+to\s+(.+)$/i, "Applied $1 to $2"],
      [/^Worked on\s+(.+)$/i, "Contributed to $1"]
    ];

    for (const [pattern, replacement] of transformations) {
      if (pattern.test(improved)) {
        const candidate = improved.replace(pattern, replacement);
        if (candidate !== original) {
          improved = candidate;
          break;
        }
      }
    }

    if (improved === original) {
      const verbFallbacks = [
        [/^Developed\b/i, "Built"],
        [/^Created\b/i, "Built"],
        [/^Implemented\b/i, "Applied"],
        [/^Used\b/i, "Applied"],
        [/^Designed\b/i, "Engineered"],
        [/^Worked on\b/i, "Contributed to"],
        [/^Built\b/i, "Engineered"]
      ];
      for (const [pattern, replacement] of verbFallbacks) {
        if (pattern.test(original)) {
          improved = original.replace(pattern, replacement);
          break;
        }
      }
    }

    return improved;
  };

  const rewrites = candidates.map((original, idx) => {
    const improved = rewriteOne(original);
    return {
      original,
      improved,
      reason: improved !== original
        ? "Rephrased the original action while preserving its factual content and avoiding unsupported metrics."
        : "The original bullet was already concise; no safe factual expansion was applied.",
      confidence: 94 - idx * 2
    };
  }).filter(item => item.improved !== item.original);

  return {
    rewrites: rewrites.length ? rewrites : [{
      original: candidates[0] || "No suitable project or experience bullet was detected.",
      improved: candidates[0] ? rewriteOne(candidates[0]) : "Add a project or experience bullet describing what you built, the technologies you used, and the result you achieved.",
      reason: candidates[0] ? "Applied a conservative factual rewrite." : "No safe resume bullet was available for rewriting.",
      confidence: candidates[0] ? 85 : 100
    }]
  };
}
function validateRewrites(result, resumeText) {
  if (!result || !Array.isArray(result.rewrites) || result.rewrites.length === 0) return false;

  const source = String(resumeText || "");
  const sourceLower = source.toLowerCase();
  const resumeNumbers = source.match(/\b\d+(?:\.\d+)?%?|\$\d+(?:\.\d+)?\b/g) || [];
  const allowedNumbers = new Set(resumeNumbers);

  const blocked = /(@|https?:\/\/|linkedin\.com|github\.com|\b(b\.?tech|m\.?tech|bachelor|master|degree|university|college|cgpa|gpa)\b|\b(chennai|india)\b)/i;

  return result.rewrites.slice(0, 5).every(item => {
    if (!item || typeof item.original !== "string" || typeof item.improved !== "string") return false;

    const original = item.original.trim();
    const improved = item.improved.trim();

    if (original.length < 20 || improved.length < 20) return false;
    if (original === improved) return false;
    if (blocked.test(original)) return false;
    if (!sourceLower.includes(original.toLowerCase().slice(0, Math.min(80, original.length)))) return false;

    const improvedNumbers = improved.match(/\b\d+(?:\.\d+)?%?|\$\d+(?:\.\d+)?\b/g) || [];
    if (!improvedNumbers.every(n => allowedNumbers.has(n))) return false;

    return true;
  });
}

async function rewriteBullets(resumeText, jobDescription) {
  try {
    const result = await callAI(
      `Rewrite only genuine resume project/experience bullets for ATS relevance.

STRICT RULES:
- Never rewrite the candidate name, contact information, education, degree, college, section headings, URLs, or standalone skill lists.
- Use only facts already present in the original bullet.
- NEVER invent percentages, numbers, users, performance improvements, awards, responsibilities, tools, or outcomes.
- Preserve every factual claim from the original bullet.
- Improve clarity, action verbs, structure, and relevance to the job description.
- Return at most 5 rewrites.
Return ONLY JSON:
{"rewrites":[{"original":"","improved":"","reason":"","confidence":0}]}`,
      `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`
    );

    if (!validateRewrites(result, resumeText)) {
      throw new Error("AI rewrite failed factual validation.");
    }

    return result;
  } catch (error) {
    return fallbackRewrites(resumeText);
  }
}

function buildGapRoadmap(missingSkills) {
  const skills = [...new Set(missingSkills || [])];
  const weekly_milestones = skills.slice(0, 4).map((skill, index) => ({
    week: index + 1,
    title: `Build working proficiency in ${skill}`,
    description: `Learn the core concepts of ${skill}, complete a small hands-on exercise, and document the implementation so it can become evidence for future applications.`
  }));

  const portfolio_projects = skills.slice(0, 3).map(skill => ({
    title: `${skill} Practical Mini Project`,
    description: `Build a small project that uses ${skill} to solve a concrete problem and document the implementation, decisions, and result.`,
    tech_stack: [skill]
  }));

  const certifications = skills.slice(0, 2).map(skill => ({
    name: `${skill} fundamentals / official learning path`,
    provider: "Official documentation or recognized training provider"
  }));

  return { weekly_milestones, portfolio_projects, certifications };
}

function fallbackGaps(resumeText, jobDescription) {
  const resumeSkills = extractKeywords(resumeText);
  const jobSkills = extractKeywords(jobDescription);
  const resumeSet = new Set(resumeSkills.map(skill => skill.toLowerCase()));
  const missing = jobSkills.filter(skill => !resumeSet.has(skill.toLowerCase()));
  const matched = jobSkills.filter(skill => resumeSet.has(skill.toLowerCase()));
  const roadmap = buildGapRoadmap(missing);

  return {
    readiness_percentage: jobSkills.length ? Math.round((matched.length / jobSkills.length) * 100) : 0,
    gap_summary: missing.length
      ? `Your resume currently evidences ${matched.length} of ${jobSkills.length} target technologies. The main gaps are ${missing.join(", ")}.`
      : "No major technology gaps were detected from the listed job requirements.",
    skill_gaps: missing.map(skill => ({
      skill,
      priority: "High",
      estimated_time: "1-2 weeks",
      resources: [
        { name: `${skill} Official Documentation`, url: `https://www.google.com/search?q=${encodeURIComponent(skill + " official documentation")}` }
      ]
    })),
    ...roadmap,
    timeline: missing.length ? `Focus on one missing skill per week: ${missing.slice(0, 4).join(", ")}.` : "Continue strengthening existing project evidence.",
    milestones: roadmap.weekly_milestones
  };
}
async function analyzeGaps(resumeText, jobDescription) {
  const deterministic = fallbackGaps(resumeText, jobDescription);
  try {
    const ai = await callAI(
      'Identify genuine skill gaps between the resume and job description. Return ONLY JSON with readiness_percentage, gap_summary, skill_gaps, weekly_milestones, certifications, portfolio_projects, timeline, milestones. Never call an existing resume skill a gap. Every target technology missing from the resume must be represented in skill_gaps.',
      `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`
    );

    const aiGaps = Array.isArray(ai?.skill_gaps) ? ai.skill_gaps : [];
    const aiNames = new Set(aiGaps.map(g => String(g?.skill || "").toLowerCase()));
    const hasAllDeterministicGaps = deterministic.skill_gaps.every(g => aiNames.has(String(g.skill).toLowerCase()));

    if (!hasAllDeterministicGaps) {
      return deterministic;
    }

    return {
      ...deterministic,
      ...ai,
      skill_gaps: aiGaps,
      readiness_percentage: deterministic.readiness_percentage
    };
  } catch (error) {
    return deterministic;
  }
}
async function generateCoverLetter(resumeText, jobDescription, candidateName = "Candidate", githubAnalysis = null) {
  try {
    const generated = await callAI(
      `Write a polished, truthful cover letter for the exact role in the job description using only evidence from the resume.

STRICT RULES:
1. The resume is the only source of truth. Never invent employers, internships, achievements, metrics, certifications, responsibilities, technologies, or project details.
2. Identify the exact job title from the job description. Do not copy the entire job-description sentence as the title.
3. Use 2 or 3 REAL projects or experiences from the resume that are relevant to the role.
4. IMPORTANT: Never attach a technology to a project unless the resume explicitly associates that technology with that project. Keep project-specific technologies separate from general skills.
5. Convert project details into natural prose. Do NOT copy resume bullet points verbatim.
6. Explain what was built, what the candidate implemented, and why it is relevant to the target role.
7. Do not simply list technologies. Connect technologies to verified project work.
8. Avoid generic filler such as "I am excited to apply", "throughout my career", "contribute immediate value", or "technical background could support your team".
9. For a student/early-career candidate, emphasize projects and academic/personal development rather than implying professional employment.
10. Write 180-260 words in 4 concise paragraphs.
11. Do not mention GitHub unless it adds meaningful evidence.
12. End with "Sincerely," followed by the candidate name.
13. Return ONLY valid JSON:
{"subject_line":"","cover_letter":"","highlights_used":[],"tone":"Professional & Tailored"}`,
      `CANDIDATE: ${candidateName}\nRESUME:\n${resumeText}\nJOB DESCRIPTION:\n${jobDescription}`
    );

    const letter = String(generated?.cover_letter || "");
    const genericSignals = [
      /I am excited to apply/i,
      /throughout my career/i,
      /contribute immediate value/i,
      /technical background could support your team/i
    ];

    const projects = extractResumeProjects(resumeText);
    const projectTitles = projects
      .map(project => String(project.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim())
      .filter(Boolean);

    const mentionsProject = projectTitles.length === 0 ||
      projectTitles.some(title => {
        const words = title.split(/\s+/).filter(Boolean).slice(0, 3);
        return words.length && words.every(word => letter.toLowerCase().includes(word));
      });

    const wordCount = letter.split(/\s+/).filter(Boolean).length;
    const normalizedLetter = letter.toLowerCase().trim();
    const normalizedCandidate = String(candidateName || '').toLowerCase().trim();
    const hasProperSignature = normalizedLetter.includes('sincerely') &&
      (!normalizedCandidate || normalizedCandidate === 'candidate' || normalizedLetter.endsWith(normalizedCandidate));

    if (
      !generated?.cover_letter ||
      genericSignals.some(pattern => pattern.test(letter)) ||
      !mentionsProject ||
      !hasProperSignature ||
      wordCount < 150 ||
      wordCount > 320
    ) {
      throw new Error("Generated cover letter failed quality checks.");
    }

    return generated;
  } catch (error) {
    return fallbackCoverLetter(resumeText, jobDescription, candidateName, githubAnalysis);
  }
}

function fallbackCoverLetter(resumeText, jobDescription, candidateName = "Candidate", githubAnalysis = null) {
  const core = fallbackCoreMatch(resumeText, jobDescription);
  const jobTitle = extractJobTitle(jobDescription);
  const projects = extractResumeProjects(resumeText).slice(0, 2);
  const matched = (core.matched_skills || []).slice(0, 4);

  const skillSentence = matched.length
    ? `The role's requirements overlap with my experience in ${matched.join(", ")}, which I have applied through project-based development work.`
    : "My project work has given me hands-on experience turning technical requirements into working applications.";

  const projectParagraphs = projects.map((project, index) => {
    const details = String(project.details || "").trim();
    if (!details) return `In ${project.title}, I worked on a practical software project and focused on implementing the core functionality described in my resume.`;
    return index === 0
      ? `A relevant example is ${project.title}. ${details.replace(/^[.!?]+/, "").trim().replace(/\s+$/, "")}.`
      : `I also worked on ${project.title}. ${details.replace(/^[.!?]+/, "").trim().replace(/\s+$/, "")}.`;
  });

  while (projectParagraphs.length < 2) {
    projectParagraphs.push("These projects strengthened my ability to break requirements into implementable features, test the result, and explain the technical decisions behind my work.");
  }

  return {
    subject_line: `Application for ${jobTitle}`,
    cover_letter: `Dear Hiring Manager,

I am applying for the ${jobTitle} position. My background is centered on hands-on academic and personal software projects, where I have focused on building working applications and applying the technologies relevant to the role. ${skillSentence}

${projectParagraphs[0]}

${projectParagraphs[1]}

I would welcome the opportunity to discuss these projects and how the skills demonstrated through them relate to the work involved in this role. Thank you for considering my application.

Sincerely,
${candidateName}`,
    highlights_used: matched,
    tone: "Professional & Tailored"
  };
}
function fallbackInterviewPrep(resumeText, jobDescription, candidateName = "Candidate") {
  const core = fallbackCoreMatch(resumeText, jobDescription);
  const matched = core.matched_skills || [];
  const missing = core.missing_skills || [];

  return {
    technical_questions: [
      {
        question: `How did you use ${matched[0] || 'the main technology'} in one of your projects?`,
        answer: `Explain the specific project, what you implemented, why you chose the technology, and one technical challenge you solved.`,
        topic: matched[0] || 'Technical Experience'
      },
      {
        question: `How would you approach learning or implementing ${missing[0] || 'a missing job requirement'}?`,
        answer: `Explain the concepts you would learn first, how you would build a small working example, and how you would validate the implementation.`,
        topic: missing[0] || 'Skill Gap'
      }
    ],
    coding_questions: [
      {
        question: 'Design a REST API endpoint for creating and retrieving a resource.',
        solution_approach: 'Define the resource schema, validate input, implement POST and GET handlers, use appropriate status codes, and handle database errors.',
        complexity: 'Depends on database indexing and query design'
      }
    ],
    behavioral_questions: [
      {
        question: 'Describe a technical challenge you faced in a project and how you solved it.',
        star_framework_guide: 'Situation: describe the project context. Task: explain the problem. Action: explain the concrete debugging or implementation steps. Result: state the actual outcome.'
      }
    ],
    project_discussion: [
      {
        question: 'Walk through your most relevant project for this role.',
        talking_points: 'Explain the problem, architecture, technologies, your contribution, important implementation decisions, challenges, and the final result.'
      }
    ]
  };
}

async function generateInterviewPrep(resumeText, jobDescription, candidateName = "Candidate", githubAnalysis = null) {
  try {
    return await callAI(
      `You are an expert technical interviewer. Use only the candidate resume and exact job description. Never invent project facts. Return ONLY valid JSON:
{"technical_questions":[{"question":"","answer":"","topic":""}],"coding_questions":[{"question":"","solution_approach":"","complexity":""}],"behavioral_questions":[{"question":"","star_framework_guide":""}],"project_discussion":[{"question":"","talking_points":""}]}`,
      `CANDIDATE: ${candidateName}\nRESUME:\n${resumeText}\nJOB DESCRIPTION:\n${jobDescription}`
    );
  } catch (error) {
    return fallbackInterviewPrep(resumeText, jobDescription, candidateName);
  }
}

async function runAllAnalyses(resumeText, jobDescription, candidateName = 'Candidate', githubAnalysis = null) {
  const results = await Promise.allSettled([
    analyzeCoreMatch(resumeText, jobDescription),
    simulateATS(resumeText, jobDescription),
    rewriteBullets(resumeText, jobDescription),
    analyzeGaps(resumeText, jobDescription),
    generateCoverLetter(resumeText, jobDescription, candidateName, githubAnalysis),
    generateInterviewPrep(resumeText, jobDescription, candidateName, githubAnalysis)
  ]);

  return {
    core_match: results[0].status === 'fulfilled' ? results[0].value : fallbackCoreMatch(resumeText, jobDescription),
    ats: results[1].status === 'fulfilled' ? results[1].value : fallbackATS(resumeText, jobDescription),
    rewrites: results[2].status === 'fulfilled' ? results[2].value : fallbackRewrites(resumeText),
    gaps: results[3].status === 'fulfilled' ? results[3].value : fallbackGaps(resumeText, jobDescription),
    cover_letter: results[4].status === 'fulfilled'
      ? results[4].value
      : fallbackCoverLetter(resumeText, jobDescription, candidateName, githubAnalysis),
    interview_prep: results[5].status === 'fulfilled'
      ? results[5].value
      : fallbackInterviewPrep(resumeText, jobDescription, candidateName)
  };
}

module.exports = {
  runAllAnalyses
};
