import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle2, Target, BookOpen, Mail, Sparkles, ShieldCheck, ArrowRight, Zap, Github, Lock, BarChart3, SearchCheck } from 'lucide-react';
import { useAnalyze } from '../hooks/useAnalyze';
import LoadingScreen from '../components/LoadingScreen';
import BackgroundEffects from '../components/BackgroundEffects';
import AiAgentsBar from '../components/AiAgentsBar';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  const { analyze, loading, progress, currentStep } = useAnalyze();
  const navigate = useNavigate();

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleAnalyze = () => {
    console.log('[DEBUG Home.js] "Analyze Resume & Verify Profile" button clicked!');
    if (!file) {
      console.warn('[DEBUG Home.js] Validation failed: No file uploaded.');
      alert('Please upload a resume (PDF or DOCX)');
      return;
    }

    if (!jobDescription.trim()) {
      console.warn('[DEBUG Home.js] Validation failed: Job description empty.');
      alert('Please enter a job description');
      return;
    }

    console.log('[DEBUG Home.js] Validation passed. Calling analyze() hook with githubUrl:', githubUrl);
    analyze(file, jobDescription, githubUrl);
  };

  if (loading) {
    return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 relative overflow-hidden">
      {BackgroundEffects && <BackgroundEffects />}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="pt-8 mb-14">
          {AiAgentsBar && <div className="mb-8"><AiAgentsBar /></div>}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-slate-300 backdrop-blur-xl mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
              AI CAREER INTELLIGENCE <span className="text-slate-600">•</span> Resume + GitHub verification
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold tracking-[-0.04em] leading-[0.98] text-white">
              Know exactly where
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">your resume stands.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-slate-400">
              SkillHive compares your resume with a target role, checks technical claims against GitHub evidence, and turns the gaps into an actionable career plan.
            </p>
          </div>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30 backdrop-blur-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 sm:px-8 py-5 border-b border-white/10">
            <div>
              <p className="text-sm font-semibold text-white">New analysis</p>
              <p className="text-xs text-slate-500 mt-1">Three inputs. One evidence-backed report.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500"><Lock className="w-3.5 h-3.5" /> Your analysis is tied to your account</div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-400 font-semibold">01 / Resume</p>
                    <h2 className="mt-1 text-base font-semibold text-white">Upload your resume</h2>
                  </div>
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div {...getRootProps()} className={`min-h-[230px] rounded-2xl border border-dashed flex items-center justify-center text-center cursor-pointer transition-all ${isDragActive ? 'border-cyan-400 bg-cyan-500/10' : file ? 'border-emerald-400/40 bg-emerald-400/[0.05]' : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/50 hover:bg-cyan-400/[0.03]'}`}>
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="px-5">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-4"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>
                      <p className="text-sm font-semibold text-emerald-300 break-all">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-2">{(file.size / 1024).toFixed(1)} KB · Ready to analyze</p>
                    </div>
                  ) : (
                    <div className="px-5">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-4"><Upload className="w-6 h-6 text-cyan-300" /></div>
                      <p className="text-sm font-semibold text-white">Drop your resume here</p>
                      <p className="text-xs text-slate-500 mt-2">or click to browse · PDF / DOCX · up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-violet-400 font-semibold">02 / Target role</p>
                      <h2 className="mt-1 text-base font-semibold text-white">Job description</h2>
                    </div>
                    <Target className="w-5 h-5 text-slate-500" />
                  </div>
                  <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description or the role requirements..." className="w-full min-h-[190px] rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-200 placeholder:text-slate-600 outline-none transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-400/5 resize-none" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-blue-400 font-semibold">03 / Evidence</p>
                      <h2 className="mt-1 text-base font-semibold text-white">GitHub profile</h2>
                    </div>
                    <Github className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="relative">
                    <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/username" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/5" />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600">Optional. Public repositories can provide supporting evidence for resume claims.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-t border-white/10 pt-7">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-2"><SearchCheck className="w-4 h-4 text-cyan-400" />Deterministic skill matching</span>
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" />Evidence verification</span>
                <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-400" />ATS analysis</span>
              </div>
              <button onClick={handleAnalyze} disabled={!file || !jobDescription.trim()} className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-35 shadow-xl shadow-white/5">
                <Zap className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" /> Analyze my profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What SkillHive checks</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">A report built around evidence.</h2>
            </div>
            <p className="hidden md:block max-w-sm text-right text-xs leading-5 text-slate-500">AI enriches the report. Core matching and verification stay grounded in extracted evidence.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: CheckCircle2, title: 'ATS inspection', text: 'See sections, formatting signals, keyword alignment and parsing issues.', color: 'text-cyan-300', bg: 'bg-cyan-400/10' },
              { icon: ShieldCheck, title: 'Skill verification', text: 'Separate resume claims from skills supported by repository evidence.', color: 'text-emerald-300', bg: 'bg-emerald-400/10' },
              { icon: BookOpen, title: 'Gap roadmap', text: 'Turn missing role requirements into concrete learning steps.', color: 'text-violet-300', bg: 'bg-violet-400/10' },
              { icon: Mail, title: 'Application kit', text: 'Generate a tailored cover letter and interview preparation.', color: 'text-blue-300', bg: 'bg-blue-400/10' }
            ].map(({ icon: Icon, title, text, color, bg }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 hover:bg-white/[0.045] transition-colors">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}><Icon className={`w-5 h-5 ${color}`} /></div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;