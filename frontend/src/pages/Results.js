import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, Terminal, BookOpen, Mail, FileText, MessageSquare, Users, Award, Code, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import ScoreCard from '../components/ScoreCard';
import SkillBadge from '../components/SkillBadge';
import RewriteCard from '../components/RewriteCard';
import RoadmapItem from '../components/RoadmapItem';
import CoverLetterCard from '../components/CoverLetterCard';
import BackgroundEffects from '../components/BackgroundEffects';
import { mergeProfile } from '../utils/profileMerger';
import { getHistory, getAnalysis } from '../api/client';
import { useAnalysisContext } from '../context/AnalysisContext';

const Results = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [result, setResult] = useState(null);
  const [openQuestionIdx, setOpenQuestionIdx] = useState(null);
  const [requestedMatches, setRequestedMatches] = useState({});
  const navigate = useNavigate();
  const { analysisData } = useAnalysisContext();

  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      if (analysisData) {
        setResult(analysisData);
        return;
      }

      const storedResult = sessionStorage.getItem('analysisResult');
      if (storedResult) {
        try {
          const parsed = JSON.parse(storedResult);
          if (!cancelled) setResult(parsed);
          return;
        } catch (error) {
          console.error('Invalid stored analysis result:', error);
          sessionStorage.removeItem('analysisResult');
        }
      }

      // Recover the most recent saved analysis when the page is opened
      // directly, after a refresh, or after session state is lost.
      try {
        const history = await getHistory();
        if (Array.isArray(history) && history.length > 0) {
          const latest = history[0];
          const fullAnalysis = await getAnalysis(latest.id);
          if (!cancelled && fullAnalysis) {
            sessionStorage.setItem('analysisResult', JSON.stringify(fullAnalysis));
            setResult(fullAnalysis);
            return;
          }
        }
      } catch (error) {
        console.error('Unable to recover latest analysis:', error);
      }

      if (!cancelled) navigate('/');
    };

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [analysisData, navigate]);

  if (!result) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center">
        <div className="text-center font-mono text-cyan-400">
          <div className="text-4xl mb-4">⚙</div>
          <p>Loading analysis results...</p>
        </div>
      </div>
    );
  }

  // Single Source of Truth Consumption
  const coreMatch = result?.coreMatch || result?.core_match || {
    overall_score: 0,
    section_scores: {},
    matched_skills: [],
    missing_skills: [],
    improvement_tips: [],
    keyword_gaps: [],
    summary: 'No analysis available'
  };

  const ats = result?.atsAnalysis || result?.ats || {
    ats_score: 0,
    parsing_issues: [],
    detected_sections: [],
    missing_sections: [],
    keyword_density: {},
    formatting_warnings: [],
    ats_verdict: 'Audit Pending'
  };

  const rewrites = result?.rewrites || { rewrites: [] };
  const gaps = result?.skillGap || result?.roadmap || result?.gaps || { readiness_percentage: 0, gap_summary: '', skill_gaps: [], milestones: [] };
  const coverLetter = result?.coverLetter || result?.cover_letter || { subject_line: '', cover_letter: '', highlights_used: [], tone: '' };
  const interviewPrep = result?.interviewPrep || result?.interview_prep || { technical_questions: [], coding_questions: [], behavioral_questions: [], project_discussion: [] };

  // Use precomputed candidate profile or generate from backend API response
  const unifiedProfile = result?.candidateProfile || result?.unified_profile || mergeProfile(result, result?.githubAnalysis || result?.github_analysis || {});

  const trustScoreData = result?.trustAnalysis || result?.trust_score || {
    score: 50,
    category: 'Medium',
    verifiedSkills: unifiedProfile.verifiedSkills?.map(v => v.skill || v.name) || [],
    unverifiedSkills: unifiedProfile.unverifiedClaims || [],
    unlocked: true
  };

  const skillSwapMatches = result?.skillSwap?.matches || result?.skill_swap || [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'unified', label: 'Unified Profile & Verification', icon: ShieldCheck },
    { id: 'ats', label: 'ATS Inspection', icon: CheckCircle2 },
    { id: 'rewrites', label: 'AI Bullet Rewrites', icon: FileText },
    { id: 'roadmap', label: 'AI Career Roadmap', icon: BookOpen },
    { id: 'coverletter', label: 'Cover Letter Generator', icon: Mail },
    { id: 'interview', label: 'Interview Preparation', icon: MessageSquare },
  ];

  const handleCopyAllRewrites = () => {
    const allRewrites = rewrites.rewrites
      ?.map(r => r.improved)
      ?.join('\n') || '';
    navigator.clipboard.writeText(allRewrites);
    toast.success('All improved bullet rewrites copied to clipboard!');
  };

  const renderOverview = () => (
    <div className="space-y-8 fade-in">
      {/* Overall Score Ring */}
      <div className="glass-card p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden">
        <h2 className="text-xl font-heading font-bold text-slate-300 mb-6 flex items-center justify-center space-x-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span>Overall Match & Verification Score</span>
        </h2>
        <div className="w-56 h-56 mx-auto relative flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="112" cy="112" r="96" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="14" fill="none" />
            <circle
              cx="112"
              cy="112"
              r="96"
              stroke="#06B6D4"
              strokeWidth="14"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 96}`}
              strokeDashoffset={`${2 * Math.PI * 96 * (1 - ((coreMatch?.overall_score || 0) / 100))}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out shadow-[0_0_20px_-3px_rgba(6,182,212,0.5)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-heading font-extrabold text-white tracking-tight glow-text-cyan">
              {Math.round(coreMatch?.overall_score || 0)}%
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest mt-1">MATCH RATING</span>
          </div>
        </div>
      </div>

      {/* Section Scores Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard title="Skills Match" score={coreMatch?.section_scores?.skills || 0} color="cyan" />
        <ScoreCard title="Experience Match" score={coreMatch?.section_scores?.experience || 0} color="green" />
        <ScoreCard title="Education Score" score={coreMatch?.section_scores?.education || 0} color="yellow" />
        <ScoreCard title="Keywords Alignment" score={coreMatch?.section_scores?.keywords || 0} color="indigo" />
      </div>

      {/* AI Evaluation Summary */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
        <h3 className="text-lg font-heading font-bold text-white mb-3 flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-purple-400" />
          <span>AI Evaluation Summary</span>
        </h3>
        <p className="text-slate-300 font-sans leading-relaxed text-sm sm:text-base">{coreMatch?.summary || "No summary available."}</p>
      </div>

      {/* Matched & Missing Skills Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-emerald-500/20">
          <h3 className="text-base font-heading font-bold mb-4 text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Matched Resume Skills ({coreMatch?.matched_skills?.length || 0})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {coreMatch?.matched_skills?.map((skill, index) => (
              <SkillBadge key={index} skill={skill} type="matched" />
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-rose-500/20">
          <h3 className="text-base font-heading font-bold mb-4 text-rose-400 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Missing Target Skills ({coreMatch?.missing_skills?.length || 0})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {coreMatch?.missing_skills?.map((skill, index) => (
              <SkillBadge key={index} skill={skill} type="missing" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUnified = () => (
    <div className="space-y-6 fade-in">
      {/* Trust Score Radar & Engine Status */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
            <div>
              <h2 className="text-xl font-heading font-bold text-white">Trust Engine Audit & Verification</h2>
              <p className="text-xs font-mono text-cyan-300/80">GitHub Code Proof & Resume Claims Verification</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              trustScoreData.category === 'High' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]' :
              trustScoreData.category === 'Medium' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
              trustScoreData.category === 'Borderline' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {trustScoreData.category?.toUpperCase() || 'MEDIUM'} TRUST ({trustScoreData.score || 75}%)
            </span>

            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              trustScoreData.unlocked ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {trustScoreData.unlocked ? 'SkillSwap: Unlocked ✓' : 'SkillSwap: Locked 🔒'}
            </span>
          </div>
        </div>

        {/* Diagnostic Banner for GitHub API errors */}
        {result?.githubAnalysis?.error && (
          <div className="p-4 mb-6 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs space-y-1">
            <div className="font-bold flex items-center space-x-2 text-amber-200">
              <AlertTriangle className="w-4 h-4" />
              <span>GitHub API Diagnostic Notice:</span>
            </div>
            <p>{result.githubAnalysis.error}</p>
          </div>
        )}

        {/* Verified Skills */}
        <div className="mb-6">
          <h3 className="text-sm font-mono uppercase text-emerald-400 font-bold mb-3 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Verified Skills ({unifiedProfile.verifiedSkills?.length || 0})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {unifiedProfile.verifiedSkills?.length > 0 ? (
              unifiedProfile.verifiedSkills.map((v, i) => (
                <SkillBadge key={i} skill={v.skill || v.name} type="verified" evidence={Array.isArray(v.evidence) ? v.evidence.join(' | ') : v.evidence} />
              ))
            ) : (
              <p className="text-xs font-mono text-slate-400">
                {result?.githubAnalysis?.error ? result.githubAnalysis.error : 'No verified code claims found in GitHub repositories.'}
              </p>
            )}
          </div>
        </div>

        {/* Unverified Resume Claims */}
        <div className="mb-6">
          <h3 className="text-sm font-mono uppercase text-amber-400 font-bold mb-3 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Unverified Resume Claims ({unifiedProfile.unverifiedClaims?.length || 0})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {unifiedProfile.unverifiedClaims?.length > 0 ? (
              unifiedProfile.unverifiedClaims.map((claim, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ⚠️ {claim}
                </span>
              ))
            ) : (
              <p className="text-xs font-mono text-slate-400">All resume claims verified.</p>
            )}
          </div>
        </div>

        {/* Resume Recommendations */}
        <div>
          <h3 className="text-sm font-mono uppercase text-cyan-400 font-bold mb-3 flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Resume Recommendations</span>
          </h3>
          <div className="space-y-3">
            {unifiedProfile.resumeRecommendations?.length > 0 ? unifiedProfile.resumeRecommendations.map((rec, i) => (
              <div key={i} className="p-4 rounded-xl bg-space-950/80 border border-white/10 text-sm leading-6 text-slate-200">
                <span className="text-cyan-400 mr-2">•</span>
                <span>{rec}</span>
              </div>
            )) : (
              <div className="p-4 rounded-xl bg-space-950/80 border border-white/10 text-sm text-slate-400">
                No automatic recommendations were generated for this profile.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SkillSwap Peer Mentorship Engine Section */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-xl font-heading font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span>SkillSwap Peer Mentorship Matches</span>
            </h3>
            <p className="text-xs font-mono text-slate-400">Database peer developer matching for reciprocal skill exchange</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {trustScoreData.unlocked ? `${skillSwapMatches.length} Matches Found` : 'Locked 🔒'}
          </span>
        </div>

        {!trustScoreData.unlocked ? (
          <div className="p-8 rounded-2xl bg-space-950/80 border border-amber-500/30 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="font-heading font-bold text-white text-base">SkillSwap Engine Locked</h4>
            <p className="text-xs font-mono text-slate-400 max-w-md mx-auto leading-relaxed">
              SkillSwap mentorship interactions require a minimum Trust Verification Score of 50%. Provide your GitHub profile URL or verify skills to unlock peer exchange.
            </p>
          </div>
        ) : skillSwapMatches.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {skillSwapMatches.map((match, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-space-950/80 border border-white/10 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-heading font-bold text-base text-white">{match.name}</h4>
                      <p className="text-xs font-mono text-cyan-400">{match.title}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30">
                      {match.compatibilityScore}% Match
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono mb-3">
                    {match.youCanTeach?.length > 0 && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-emerald-400 font-bold block mb-1">You Can Help Them With</span>
                        <p className="text-slate-300 leading-relaxed">
                          You can help <span className="text-white font-semibold">{match.name}</span> with {match.youCanTeach.join(', ')}.
                        </p>
                      </div>
                    )}
                    {match.theyCanTeach?.length > 0 && (
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-cyan-400 font-bold block mb-1">They Can Help You With</span>
                        <p className="text-slate-300 leading-relaxed">
                          <span className="text-white font-semibold">{match.name}</span> can help you with {match.theyCanTeach.join(', ')}.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-mono text-slate-400">
                    {!match.youCanTeach?.length && !match.theyCanTeach?.length && (
                      <p>No reciprocal skill overlap was found for this match.</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => { setRequestedMatches(prev => ({ ...prev, [match.name]: true })); toast.success(`SkillSwap request sent to ${match.name}!`); }}
                  disabled={!!requestedMatches[match.name]}
                  className={`w-full py-2 px-4 rounded-xl border text-xs font-mono font-semibold transition-all ${requestedMatches[match.name] ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 cursor-default' : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40'}`}
                >
                  {requestedMatches[match.name] ? '✓ Request Sent' : 'Connect for SkillSwap'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-space-950/80 border border-purple-500/30 text-center space-y-3">
            <Users className="w-10 h-10 text-purple-400 mx-auto" />
            <h4 className="font-heading font-bold text-white text-base">No compatible candidates are available yet.</h4>
            <p className="text-xs font-mono text-slate-400 max-w-md mx-auto leading-relaxed">
              Recommendations will appear as more users join. Your profile has been registered in the matching engine.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderATS = () => (
    <div className="space-y-6 fade-in">
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">ATS Compatibility Audit</h2>
            <p className="text-xs font-mono text-slate-400">Automated Screening Filter Simulation</p>
          </div>
          <p className={`w-full px-4 py-3 rounded-2xl font-mono text-xs font-semibold leading-relaxed border break-words ${
            ats.ats_verdict?.includes('Pass')
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            {ats.ats_verdict || 'Audit Completed'}
          </p>
        </div>

        {/* ATS Progress Bar */}
        <div className="space-y-2 mb-8">
          <div className="w-full h-4 bg-space-950 rounded-full p-0.5 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-700 shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]"
              style={{ width: `${ats.ats_score || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>ATS Compatibility Index</span>
            <span className="text-cyan-400 font-bold">{Math.round(ats.ats_score || 0)}%</span>
          </div>
        </div>

        {/* Section Checks Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-space-950/80 border border-white/10">
            <h3 className="font-heading font-bold text-white text-base mb-3">Detected Resume Sections</h3>
            <ul className="space-y-2">
              {ats.detected_sections?.map((sec, i) => (
                <li key={i} className="flex items-center text-xs font-mono text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  {sec}
                </li>
              ))}
            </ul>
          </div>

          {ats.missing_sections?.length > 0 && (
            <div className="p-5 rounded-2xl bg-space-950/80 border border-rose-500/20">
              <h3 className="font-heading font-bold text-rose-400 text-base mb-3">Missing Standard Sections</h3>
              <ul className="space-y-2">
                {ats.missing_sections.map((sec, i) => (
                  <li key={i} className="flex items-center text-xs font-mono text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-400 mr-2" />
                    {sec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Keyword Density Table */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="font-heading font-bold text-white text-base mb-4">ATS Keyword Density Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="pb-3 pr-4 w-1/2">High Match Keywords</th>
                  <th className="pb-3 w-1/2">Missing Keywords</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 pr-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {ats.keyword_density?.high_match?.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {ats.keyword_density?.missing?.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRewrites = () => (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">AI-Optimized Bullet Rewrites</h2>
          <p className="text-xs font-mono text-slate-400">Action-oriented impact bullet points</p>
        </div>
        <button
          onClick={handleCopyAllRewrites}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-xs shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] transition-all"
        >
          <Copy className="w-4 h-4" />
          <span>Copy All Rewrites</span>
        </button>
      </div>
      <div className="space-y-4">
        {rewrites.rewrites?.map((rewrite, index) => (
          <RewriteCard key={index} rewrite={rewrite} />
        ))}
      </div>
    </div>
  );

  const renderRoadmap = () => (
    <div className="space-y-6 fade-in">
      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">AI Career Roadmap</h2>
          <p className="text-xs font-mono text-cyan-300">{gaps.gap_summary || 'Tailored skill upskilling and certification trajectory'}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-mono text-slate-400 block uppercase">Target Readiness Index</span>
          <span className="text-5xl font-heading font-extrabold text-cyan-400 glow-text-cyan">
            {Math.round(gaps.readiness_percentage || 0)}%
          </span>
        </div>
      </div>

      {/* Weekly Milestones */}
      {gaps.weekly_milestones?.length > 0 && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
          <h3 className="font-heading font-bold text-white text-lg mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Weekly Learning Roadmap</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {gaps.weekly_milestones.map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-space-950/80 border border-white/10">
                <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-mono font-bold">
                  Week {m.week || idx + 1}
                </span>
                <h4 className="font-heading font-bold text-white text-sm mt-2 mb-1">{m.title}</h4>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Certifications & Projects */}
      <div className="grid md:grid-cols-2 gap-6">
        {gaps.certifications?.length > 0 && (
          <div className="glass-card p-6 rounded-3xl border border-cyan-500/20">
            <h3 className="font-heading font-bold text-cyan-400 text-base mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Recommended Industry Certifications</span>
            </h3>
            <ul className="space-y-3">
              {gaps.certifications.map((cert, i) => (
                <li key={i} className="p-3 rounded-xl bg-space-950/80 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white">{cert.name}</h4>
                    <p className="text-[10px] font-mono text-cyan-300">{cert.provider}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {gaps.portfolio_projects?.length > 0 && (
          <div className="glass-card p-6 rounded-3xl border border-purple-500/20">
            <h3 className="font-heading font-bold text-purple-400 text-base mb-4 flex items-center space-x-2">
              <Code className="w-5 h-5" />
              <span>Portfolio Projects to Build</span>
            </h3>
            <div className="space-y-3">
              {gaps.portfolio_projects.map((proj, i) => (
                <div key={i} className="p-3 rounded-xl bg-space-950/80 border border-purple-500/30">
                  <h4 className="text-xs font-mono font-bold text-white">{proj.title}</h4>
                  <p className="text-[11px] font-sans text-slate-300 my-1">{proj.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {proj.tech_stack?.map((t, k) => (
                      <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skill Gap Analysis Cards */}
      <div>
        <h3 className="font-heading font-bold text-white text-lg mb-4">Skill Gap Analysis & Resources</h3>
        {gaps.skill_gaps?.map((gap, index) => (
          <RoadmapItem key={index} gap={gap} />
        ))}
      </div>
    </div>
  );

  const renderCoverLetter = () => (
    <div className="fade-in">
      <CoverLetterCard coverLetter={coverLetter} />
    </div>
  );

  const renderInterview = () => (
    <div className="space-y-6 fade-in">
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/10">
          <MessageSquare className="w-7 h-7 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">AI Interview Preparation</h2>
            <p className="text-xs font-mono text-cyan-300">Technical, coding, behavioral & project discussion questions</p>
          </div>
        </div>

        {/* Technical Questions */}
        <div className="space-y-4 mb-8">
          <h3 className="font-heading font-bold text-white text-base flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>Technical Concept Questions</span>
          </h3>

          <div className="space-y-3">
            {interviewPrep.technical_questions?.map((q, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-space-950/80 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {q.topic || 'Core Stack'}
                    </span>
                    <h4 className="font-heading font-bold text-white text-sm mt-2">{q.question}</h4>
                  </div>
                  <button
                    onClick={() => setOpenQuestionIdx(openQuestionIdx === `tech-${idx}` ? null : `tech-${idx}`)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {openQuestionIdx === `tech-${idx}` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {openQuestionIdx === `tech-${idx}` && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs font-mono text-emerald-300 bg-emerald-500/10 p-3 rounded-xl">
                    <span className="font-bold text-emerald-400 block mb-1">Suggested Answer Strategy:</span>
                    {q.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Coding & Algorithmic Questions */}
        <div className="space-y-4 mb-8">
          <h3 className="font-heading font-bold text-white text-base flex items-center space-x-2">
            <Code className="w-5 h-5 text-purple-400" />
            <span>Coding & System Design Challenges</span>
          </h3>

          <div className="space-y-3">
            {interviewPrep.coding_questions?.map((q, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-space-950/80 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-heading font-bold text-white text-sm">{q.question}</h4>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300">
                    {q.complexity || 'O(N)'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-300 leading-relaxed bg-space-950 p-3 rounded-xl border border-white/5">
                  <span className="text-purple-400 font-bold">Solution Approach: </span>
                  {q.solution_approach}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Behavioral & Project Questions */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-space-950/80 border border-white/10">
            <h3 className="font-heading font-bold text-white text-sm mb-3 text-cyan-400">Behavioral (STAR Method)</h3>
            {interviewPrep.behavioral_questions?.map((q, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                <p className="text-xs font-bold text-white mb-1">{q.question}</p>
                <p className="text-[11px] font-mono text-slate-300 leading-relaxed bg-space-950 p-2.5 rounded-lg border border-white/5">
                  {q.star_framework_guide}
                </p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-space-950/80 border border-white/10">
            <h3 className="font-heading font-bold text-white text-sm mb-3 text-emerald-400">Resume Project Deep-Dive</h3>
            {interviewPrep.project_discussion?.map((q, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                <p className="text-xs font-bold text-white mb-1">{q.question}</p>
                <p className="text-[11px] font-mono text-slate-300 leading-relaxed bg-space-950 p-2.5 rounded-lg border border-white/5">
                  {q.talking_points}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-space-950 pt-8 pb-20 px-4 relative overflow-hidden">
      {BackgroundEffects && <BackgroundEffects />}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl glass-pill text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all font-mono text-xs w-fit"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Return to Command Center</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">
            Analysis Results & Verification Dashboard
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 glass-card rounded-2xl p-1.5 mb-8 overflow-x-auto border border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Component */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'unified' && renderUnified()}
          {activeTab === 'ats' && renderATS()}
          {activeTab === 'rewrites' && renderRewrites()}
          {activeTab === 'roadmap' && renderRoadmap()}
          {activeTab === 'coverletter' && renderCoverLetter()}
          {activeTab === 'interview' && renderInterview()}
        </div>
      </div>
    </div>
  );
};

export default Results;
