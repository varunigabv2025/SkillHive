import React, { useState } from 'react';
import { Copy, Download, Check, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const CoverLetterCard = ({ coverLetter, candidateName }) => {
  const [copied, setCopied] = useState(false);

  const letterText = String(coverLetter?.cover_letter || '').trim();
  const safeName = String(candidateName || '').trim();
  const displayLetter = safeName && safeName !== 'Candidate' && /Sincerely,?\s*$/i.test(letterText)
    ? `${letterText}\n${safeName}`
    : letterText;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayLetter);
    setCopied(true);
    toast.success('Cover letter copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = `Subject: ${coverLetter?.subject_line || 'Application'}\n\n${displayLetter}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover_letter.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Cover letter downloaded!');
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#080d1d]/90 shadow-[0_24px_80px_-35px_rgba(0,0,0,.9)] backdrop-blur-2xl">\n      <div className="pointer-events-none absolute -top-32 right-0 h-64 w-64 rounded-full bg-violet-500/10 blur-[90px]" />\n      <div className="pointer-events-none absolute -bottom-32 left-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-[90px]" />\n      <div className="relative p-6 sm:p-8">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-10 h-10 rounded-xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center shadow-[0_0_24px_-8px_rgba(34,211,238,.7)]"><FileText className="w-5 h-5 text-cyan-300" /></div>
            <div><div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70 font-semibold">Application Studio</div><h3 className="font-heading font-bold text-xl text-white mt-0.5">AI-Generated Cover Letter</h3></div>
          </div>
          <p className="text-xs font-mono text-cyan-300/80">
            Subject: <span className="text-slate-200">{coverLetter?.subject_line || 'Application for Position'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all font-mono text-xs shadow-neon-cyan"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Letter'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all font-mono text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Tone & Highlights Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Tone: {coverLetter?.tone || 'Professional'}</span>
        </span>

        {coverLetter?.highlights_used?.map((highlight, index) => (
          <span key={index} className="px-3 py-1 rounded-full text-xs font-mono bg-space-950 text-slate-300 border border-white/10">
            ★ {highlight}
          </span>
        ))}
      </div>

      {/* Main Cover Letter Document */}
      <div className="p-6 rounded-2xl bg-space-950/90 border border-white/10 text-slate-200 font-sans text-sm sm:text-base leading-relaxed whitespace-pre-wrap select-text shadow-inner">
        {displayLetter || 'Generating tailored cover letter...'}
      </div>
      </div>
    </div>
  );
};

export default CoverLetterCard;
