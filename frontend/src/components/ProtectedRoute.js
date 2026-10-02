import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Cpu className="w-10 h-10 text-cyan-400 animate-pulse" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

export default ProtectedRoute;
