import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Cpu, History, Sparkles, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[1px] shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-space-950 rounded-[11px] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  SKILLBRIDGE <span className="text-cyan-400">AI</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-wide hidden sm:block">
                Developer Intelligence & Skill Verification
              </p>
            </div>
          </Link>

          {/* System Status Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-pill border border-emerald-500/30 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-medium tracking-wide">SYSTEM ONLINE</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Trust Engine Active
            </span>
          </div>

          {/* Navigation Links */}
          {user && (
          <nav className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.pathname === '/'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Command Center</span>
            </Link>

            <Link
              to="/history"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.pathname === '/history'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="w-4 h-4 text-purple-400" />
              <span>{isAdmin ? 'All User Logs' : 'Analysis Logs'}</span>
            </Link>

            <div className="flex items-center space-x-2 pl-2 sm:pl-4 border-l border-white/10">
              <div className="hidden sm:block text-right leading-tight">
                <p className="text-xs font-semibold text-slate-100">{user.name}</p>
                <p className={`text-[10px] font-mono uppercase tracking-wider ${isAdmin ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isAdmin ? 'Admin' : 'User'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </nav>
          )}

        </div>
      </div>
    </header>
  );
};

export default Navbar;
