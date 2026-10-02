import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Lock, User, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import BackgroundEffects from '../components/BackgroundEffects';
import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full glass-input rounded-2xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none font-mono text-sm border border-white/10 focus:border-cyan-500/50 transition-colors';

const Login = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from || '/';
  if (user) return <Navigate to={destination} replace />;

  const isRegister = mode === 'register';
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const signedIn = isRegister
        ? await register(form.username, form.password)
        : await login(form.username, form.password);
      toast.success(`Welcome, ${signedIn.name}!`);
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-space-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {BackgroundEffects && <BackgroundEffects />}

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 w-full max-w-md border border-white/10 relative z-10 space-y-5">
        <div className="text-center">
          <Cpu className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <h1 className="text-2xl font-heading font-extrabold text-white">
            {isRegister ? 'Create your account' : 'Sign in to SkillBridge AI'}
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            {isRegister ? 'Your analyses are saved privately to your account' : 'Admins and users sign in here'}
          </p>
        </div>

        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            required
            minLength={isRegister ? 3 : undefined}
            maxLength={32}
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            value={form.username}
            onChange={update('username')}
            className={inputClass}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="password"
            required
            minLength={isRegister ? 8 : undefined}
            placeholder={isRegister ? 'Password (min 8 characters)' : 'Password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={update('password')}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-space-950 font-heading font-bold text-sm shadow-[0_0_20px_-3px_rgba(6,182,212,0.5)] transition-all"
        >
          {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          <span>{submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</span>
        </button>

        <p className="text-center text-xs font-mono text-slate-400">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" onClick={() => setMode(isRegister ? 'login' : 'register')} className="text-cyan-400 hover:text-cyan-300 underline">
            {isRegister ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  );
};

export default Login;
