import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getUserProfile } from '../api/client';

export const TOKEN_KEY = 'lick_library_token';

export interface UserProfile {
  userId: number;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

function decodeJwt(token: string): UserProfile | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { userId: Number(payload.sub), role: payload.role, status: payload.status };
  } catch {
    return null;
  }
}

interface AuthContextValue {
  currentUser: UserProfile | null;
  token: string | null;
  statusResolved: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? decodeJwt(t) : null;
  });
  const [statusResolved, setStatusResolved] = useState<boolean>(!localStorage.getItem(TOKEN_KEY));

  const login = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setCurrentUser(decodeJwt(newToken));
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setStatusResolved(true);
      return;
    }
    getUserProfile()
      .then(profile => {
        setCurrentUser(u => u ? { ...u, role: profile.role, status: profile.status } : u);
      })
      .catch(() => {})
      .finally(() => setStatusResolved(true));
  }, [token]);

  return (
    <AuthContext.Provider value={{ currentUser, token, statusResolved, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
