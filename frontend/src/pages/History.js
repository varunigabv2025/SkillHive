import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, getAnalysis } from '../api/client';
import { Eye, Calendar, Briefcase, Terminal, ArrowLeft, Cpu, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import BackgroundEffects from '../components/BackgroundEffects';
import { useAuth } from '../context/AuthContext';

const History = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState('all');
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const owners = [...new Map(analyses.map(a => [a.user_id ?? 'none', a.user_name])).entries()];
  const visibleAnalyses = ownerFilter === 'all'
    ? analyses
    : analyses.filter(a => String(a.user_id ?? 'none') === ownerFilter);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setAnalyses(data || []);
    } catch (error) {
      toast.error('Failed to load analysis history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id) => {
    try {
      const analysis = await getAnalysis(id);
      sessionStorage.setItem('analysisResult', JSON.stringify(analysis));
      navigate('/results');
    } catch (error) {
      toast.error('Failed to load analysis details');
      console.error(error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreBadge = (score) => {
    const rounded = Math.round(score || 0);
    if (rounded >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]';
    if (rounded >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center relative overflow-hidden">
        {BackgroundEffects && <BackgroundEffects />}
        <div className="relative z-10 text-center">
          <Cpu className="w-12 h-12 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-sm font-mono text-cyan-300">Fetching Analysis History Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-950 pt-8 pb-20 px-4 relative overflow-hidden">
      {BackgroundEffects && <BackgroundEffects />}

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Terminal className="w-6 h-6 text-purple-400" />
              <h1 className="text-3xl font-heading font-extrabold text-white">
                {isAdmin ? 'All Users’ Analysis Logs' : 'Analysis History Logs'}
              </h1>
            </div>
            <p className="text-xs font-mono text-slate-400">
              {isAdmin ? 'Admin view: analyses from every account' : 'Your previously evaluated resumes'}
            </p>
            {isAdmin && owners.length > 0 && (
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="mt-3 glass-input rounded-xl px-3 py-2 text-xs font-mono text-slate-100 border border-white/10 focus:outline-none"
              >
                <option value="all">All users ({analyses.length})</option>
                {owners.map(([id, name]) => (
                  <option key={id} value={String(id)}>{name}</option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl glass-pill text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all font-mono text-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Return to Command Center</span>
          </button>
        </div>

        {/* History List */}
        {analyses.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
            <Sparkles className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-bounce" />
            <p className="text-lg font-heading font-bold text-white mb-1">No Past Analyses Logged</p>
            <p className="text-xs font-mono text-slate-400 mb-6">Upload a resume in the Command Center to record audit history.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-space-950 font-heading font-bold text-sm shadow-[0_0_20px_-3px_rgba(6,182,212,0.5)] transition-all"
            >
              Analyze Your First Resume
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="glass-card-hover p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-bold text-lg text-white">
                      {analysis.job_title || 'Software Position'}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 ml-1">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{formatDate(analysis.created_at)}</span>
                    </div>
                    <span>•</span>
                    <span className="text-slate-500">ID: #{analysis.id}</span>
                    {isAdmin && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400">{analysis.user_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-6">
                  <div className="text-right">
                    <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Match Score</p>
                    <span className={`px-3 py-1 rounded-full text-base font-heading font-bold border ${getScoreBadge(analysis.overall_score)}`}>
                      {Math.round(analysis.overall_score || 0)}%
                    </span>
                  </div>

                  <button
                    onClick={() => handleView(analysis.id)}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
