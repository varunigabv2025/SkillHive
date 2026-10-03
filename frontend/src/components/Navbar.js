import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#07090f]/85 backdrop-blur-2xl shadow-[0_8px_30px_-20px_rgba(34,211,238,.35)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#111b38] via-[#0b1224] to-[#07090f] shadow-[0_0_30px_-8px_rgba(34,211,238,0.65)] overflow-hidden transition-transform duration-300 group-hover:scale-[1.04]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,.22),transparent_48%),radial-gradient(circle_at_75%_80%,rgba(168,85,247,.22),transparent_48%)]" />
              <svg viewBox="0 0 48 48" className="relative w-full h-full p-2" aria-hidden="true">
                <defs>
                  <linearGradient id="skillhive-logo-gradient" x1="5" y1="5" x2="43" y2="43">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="52%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <path d="M24 5.5 39.5 14.5v19L24 42.5 8.5 33.5v-19L24 5.5Z" fill="none" stroke="url(#skillhive-logo-gradient)" strokeWidth="2.2" />
                <path d="M16 24h16M20 16.5l8 15M28 16.5l-8 15" stroke="url(#skillhive-logo-gradient)" strokeWidth="1.4" opacity=".8" />
                <circle cx="16" cy="24" r="2.7" fill="#22d3ee" />
                <circle cx="28" cy="16.5" r="2.7" fill="#3b82f6" />
                <circle cx="28" cy="31.5" r="2.7" fill="#a855f7" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-[17px] font-extrabold tracking-[-0.025em] text-white">SKILL<span className="text-cyan-300">HIVE</span></div>
                <span className="hidden lg:inline-flex px-1.5 py-0.5 rounded-md border border-cyan-400/20 bg-cyan-400/5 text-[8px] font-bold tracking-[0.16em] text-cyan-300">AI</span>
              </div>
              <div className="hidden sm:block text-[9px] uppercase tracking-[0.2em] text-slate-500">Career Intelligence</div>
            </div>
          </Link>

          {/* Navigation Links */}
          {user && (
          <nav className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                location.pathname === '/'
                  ? 'bg-white/[0.07] text-white border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
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
