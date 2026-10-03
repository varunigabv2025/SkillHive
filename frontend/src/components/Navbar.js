import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, ShieldCheck, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07090f]/80 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/5">
              <span className="text-sm font-black text-slate-950">S</span>
            </div>
            <div>
              <div className="text-[17px] font-extrabold tracking-[-0.02em] text-white">SKILLHIVE</div>
              <div className="hidden sm:block text-[9px] uppercase tracking-[0.18em] text-slate-500">Career Intelligence</div>
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
