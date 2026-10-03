import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getCurrentUser, TOKEN_KEY, AUTH_EXPIRED_EVENT } from '../api/client';

const AuthContext = createContext(null);

const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(readToken()));

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('analysisResult');
      sessionStorage.removeItem('selectedAnalysisId');
    } catch (e) {}
    setUser(null);
  }, []);

  useEffect(() => {
    if (!readToken()) return;
    getCurrentUser()
      .then(setUser)
      .catch(clearSession)
      .finally(() => setChecking(false));
  }, [clearSession]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
  }, [clearSession]);

  const startSession = ({ token, user: nextUser }) => {
    try {
      sessionStorage.removeItem('analysisResult');
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {}
    setUser(nextUser);
    return nextUser;
  };

  const login = async (username, password) => startSession(await loginUser(username, password));
  const register = async (username, password) => startSession(await registerUser(username, password));

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout: clearSession, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
