require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./database');
const { analyzeCandidate } = require('./services/analysisOrchestrator');
const { analyzeGithubProfile } = require('./githubAnalyzer');
const { router: authRouter, requireAuth, requireAdmin } = require('./auth');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'https://skill-hive-green.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes

app.use('/api/auth', authRouter);

// POST /api/analyze - Single Source of Truth Endpoint
app.post('/api/analyze', requireAuth, upload.single('resume_file'), async (req, res) => {
  try {
    const { job_description, github_url } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!job_description) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Execute Unified Analysis Orchestrator
    const unifiedResult = await analyzeCandidate({
      resumeBuffer: file.buffer,
      mimeType: file.mimetype,
      jobDescription: job_description,
      githubUrl: github_url
    });

    // Provide root-level backwards-compatibility keys
    unifiedResult.id = Date.now();
    unifiedResult.created_at = unifiedResult.metadata.createdAt;
    unifiedResult.job_title = unifiedResult.metadata.jobTitle;
    unifiedResult.core_match = unifiedResult.coreMatch;
    unifiedResult.ats = unifiedResult.atsAnalysis;
    unifiedResult.trust_score = unifiedResult.trustAnalysis;
    unifiedResult.skill_swap = unifiedResult.skillSwap.matches;
    unifiedResult.cover_letter = unifiedResult.coverLetter;
    unifiedResult.interview_prep = unifiedResult.interviewPrep;
    unifiedResult.gaps = unifiedResult.skillGap;
    unifiedResult.unified_profile = unifiedResult.candidateProfile;

    // Save to database
    const insertQuery = `
      INSERT INTO resume_analyses (
        job_title, job_description, resume_text, overall_score,
        section_scores, matched_skills, missing_skills, improvement_tips,
        keyword_gaps, summary, ats_score, parsing_issues, detected_sections,
        missing_sections, keyword_density, formatting_warnings, ats_verdict,
        rewrites, readiness_percentage, gap_summary, skill_gaps, milestones,
        subject_line, cover_letter, highlights_used, tone, trust_score, skill_swap,
        interview_prep, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      unifiedResult.metadata.jobTitle,
      job_description,
      '',
      unifiedResult.coreMatch.overall_score || 0,
      JSON.stringify(unifiedResult.coreMatch.section_scores || {}),
      JSON.stringify(unifiedResult.coreMatch.matched_skills || []),
      JSON.stringify(unifiedResult.coreMatch.missing_skills || []),
      JSON.stringify(unifiedResult.coreMatch.improvement_tips || []),
      JSON.stringify(unifiedResult.coreMatch.keyword_gaps || []),
      unifiedResult.coreMatch.summary || '',
      unifiedResult.atsAnalysis.ats_score || 0,
      JSON.stringify(unifiedResult.atsAnalysis.parsing_issues || []),
      JSON.stringify(unifiedResult.atsAnalysis.detected_sections || []),
      JSON.stringify(unifiedResult.atsAnalysis.missing_sections || []),
      JSON.stringify(unifiedResult.atsAnalysis.keyword_density || {}),
      JSON.stringify(unifiedResult.atsAnalysis.formatting_warnings || []),
      unifiedResult.atsAnalysis.ats_verdict || '',

      JSON.stringify(unifiedResult.rewrites.rewrites || []),

      unifiedResult.skillGap.readiness_percentage || 0,
      unifiedResult.skillGap.gap_summary || '',
      JSON.stringify(unifiedResult.skillGap.skill_gaps || []),
      JSON.stringify(unifiedResult.skillGap.milestones || []),

      unifiedResult.coverLetter.subject_line || '',
      unifiedResult.coverLetter.cover_letter || '',
      JSON.stringify(unifiedResult.coverLetter.highlights_used || []),
      unifiedResult.coverLetter.tone || '',
      JSON.stringify(unifiedResult.trustAnalysis),
      JSON.stringify(unifiedResult.skillSwap.matches),
      JSON.stringify(unifiedResult.interviewPrep),
      req.user.id
    ];
    
    db.run(insertQuery, values, function(err) {
      if (!err && this.lastID) {
        unifiedResult.id = this.lastID;
      }
      console.log("UNIFIED SINGLE SOURCE OF TRUTH ANALYSIS RESPONSE SENT.");
      res.json(unifiedResult);
    });
    
  } catch (error) {
    console.error('Analysis orchestrator error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/history - users see their own analyses, admins see everyone's
app.get('/api/history', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const query = `
    SELECT a.id, a.created_at, a.job_title, a.overall_score, a.user_id,
           u.username AS user_name
    FROM resume_analyses a
    LEFT JOIN users u ON u.id = a.user_id
    ${isAdmin ? '' : 'WHERE a.user_id = ?'}
    ORDER BY a.created_at DESC
  `;

  db.all(query, isAdmin ? [] : [req.user.id], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
    
    const analyses = rows.map(row => ({
      id: row.id,
      created_at: row.created_at,
      job_title: row.job_title,
      overall_score: row.overall_score,
      user_id: row.user_id,
      user_name: row.user_name || (row.user_id ? 'Deleted user' : 'Legacy (no owner)')
    }));

    res.json(analyses);
  });
});

// GET /api/admin/users - admin overview of all accounts
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const query = `
    SELECT u.id, u.username, u.role, u.created_at, COUNT(a.id) AS analysis_count
    FROM users u
    LEFT JOIN resume_analyses a ON a.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(rows);
  });
});

// GET /api/history/:id
app.get('/api/history/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM resume_analyses WHERE id = ?';

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch analysis' });
    }

    if (!row || (req.user.role !== 'admin' && row.user_id !== req.user.id)) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    let parsedTrust = {};
    let parsedSkillSwap = [];
    let parsedInterviewPrep = {};
    try { parsedTrust = JSON.parse(row.trust_score || '{}'); } catch (e) {}
    try { parsedSkillSwap = JSON.parse(row.skill_swap || '[]'); } catch (e) {}
    try { parsedInterviewPrep = JSON.parse(row.interview_prep || '{}'); } catch (e) {}

    const coreMatch = {
      overall_score: row.overall_score,
      section_scores: JSON.parse(row.section_scores || '{}'),
      matched_skills: JSON.parse(row.matched_skills || '[]'),
      missing_skills: JSON.parse(row.missing_skills || '[]'),
      improvement_tips: JSON.parse(row.improvement_tips || '[]'),
      keyword_gaps: JSON.parse(row.keyword_gaps || '[]'),
      summary: row.summary || ''
    };

    const atsAnalysis = {
      ats_score: row.ats_score,
      parsing_issues: JSON.parse(row.parsing_issues || '[]'),
      detected_sections: JSON.parse(row.detected_sections || '[]'),
      missing_sections: JSON.parse(row.missing_sections || '[]'),
      keyword_density: JSON.parse(row.keyword_density || '{}'),
      formatting_warnings: JSON.parse(row.formatting_warnings || '[]'),
      ats_verdict: row.ats_verdict || ''
    };

    const skillGap = {
      readiness_percentage: row.readiness_percentage,
      gap_summary: row.gap_summary || '',
      skill_gaps: JSON.parse(row.skill_gaps || '[]'),
      milestones: JSON.parse(row.milestones || '[]')
    };

    const coverLetter = {
      subject_line: row.subject_line || '',
      cover_letter: row.cover_letter || '',
      highlights_used: JSON.parse(row.highlights_used || '[]'),
      tone: row.tone || 'Professional'
    };

    const analysis = {
      id: row.id,
      created_at: row.created_at,
      job_title: row.job_title,
      candidateProfile: {
        user: { name: 'Candidate', title: row.job_title },
        verifiedSkills: (parsedTrust.verifiedSkills || []).map(s => ({ skill: s, evidence: 'Verified code evidence' })),
        unverifiedClaims: parsedTrust.unverifiedSkills || []
      },
      githubAnalysis: null,
      atsAnalysis,
      trustAnalysis: parsedTrust,
      skillGap,
      roadmap: skillGap,
      coverLetter,
      interviewPrep: parsedInterviewPrep,
      skillSwap: {
        matches: parsedSkillSwap,
        unlocked: parsedTrust.unlocked || false,
        status: parsedTrust.unlocked ? 'UNLOCKED' : 'LOCKED'
      },
      coreMatch,
      rewrites: { rewrites: JSON.parse(row.rewrites || '[]') },
      recommendations: [],
      metadata: {
        status: 'SUCCESS',
        confidence: 95,
        createdAt: row.created_at,
        jobTitle: row.job_title,
        warnings: [],
        errors: []
      },
      // Root-level aliases
      core_match: coreMatch,
      ats: atsAnalysis,
      trust_score: parsedTrust,
      skill_swap: parsedSkillSwap,
      gaps: skillGap,
      cover_letter: coverLetter,
      interview_prep: parsedInterviewPrep
    };
    
    res.json(analysis);
  });
});

// POST /api/github/analyze
app.post('/api/github/analyze', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;

    const result = await analyzeGithubProfile(username);

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('GitHub analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
