import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { setAccessToken } from '@/api/client';
import { authService, AuthResponse } from '@/services/authService';

type AuthContextValue = {
  session: AuthResponse | null;
  login: (username: string, password: string) => Promise<AuthResponse>;
  loginStaff: (username: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  updateSessionUser: (user: NonNullable<AuthResponse['user']>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(null);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    async login(username, password) {
      try {
        const response = await authService.login({ username, password });
        setAccessToken(response.token);
        setSession(response);
        return response;
      } catch {
        const response = await authService.staffLogin({ username, password });
        setAccessToken(response.token);
        setSession(response);
        return response;
      }
    },
    async loginStaff(username, password) {
      const response = await authService.staffLogin({ username, password });
      setAccessToken(response.token);
      setSession(response);
      return response;
    },
    logout() {
      setAccessToken(null);
      setSession(null);
    },
    updateSessionUser(user) {
      setSession((current) => current ? { ...current, user } : current);
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
