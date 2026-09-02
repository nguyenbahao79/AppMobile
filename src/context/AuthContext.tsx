import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Href, useRouter } from 'expo-router';

import { apiClient, clearSession, restoreTokensFromStorage, setOnForceLogout, setSessionTokens } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  setTokens,
} from '@/api/secureStorage';
import { authService, AuthResponse } from '@/services/authService';
import { isJwtExpired } from '@/utils/jwt';

type AuthContextValue = {
  session: AuthResponse | null;
  isRestoring: boolean;
  login: (account: string, password: string) => Promise<AuthResponse>;
  loginStaff: (account: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateSessionUser: (user: NonNullable<AuthResponse['user']>) => void;
  updateSessionStaff: (staff: NonNullable<AuthResponse['staff']>) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistSession(response: AuthResponse) {
  setSessionTokens(response.token, response.refreshToken);
  // Tokens go to SecureStore, the full session payload (user/staff info) to AsyncStorage.
  await Promise.all([
    setStoredSession(response),
    setTokens({ token: response.token, refreshToken: response.refreshToken }),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Đăng nhập tài khoản này ở nơi khác (web/app khác) làm đổi session_version phía BE — request
  // tiếp theo của phiên này sẽ bị từ chối cả access lẫn refresh token. client.ts đã tự xóa token
  // khỏi storage lúc đó; ở đây chỉ cần đồng bộ lại state React + điều hướng về màn login ngay,
  // không đợi người dùng tự phát hiện qua thông báo lỗi.
  useEffect(() => {
    setOnForceLogout(() => {
      setSession(null);
      clearStoredSession().catch(() => {});
      router.replace('/(auth)/login' as Href);
    });
    return () => setOnForceLogout(null);
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const [storedSession, tokens] = await Promise.all([
          getStoredSession(),
          restoreTokensFromStorage(),
        ]);
        const hasValidAccess = !!tokens.token && !isJwtExpired(tokens.token);
        const hasValidRefresh = !!tokens.refreshToken && !isJwtExpired(tokens.refreshToken);

        if (storedSession && (hasValidAccess || hasValidRefresh)) {
          setSession(storedSession);
        } else {
          await clearSession();
          await clearStoredSession();
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isRestoring,
    async login(account, password) {
      let response: AuthResponse;
      try {
        response = await authService.login({ account, password });
      } catch {
        response = await authService.staffLogin({ account, password });
      }
      await persistSession(response);
      setSession(response);
      return response;
    },
    async loginStaff(account, password) {
      const response = await authService.staffLogin({ account, password });
      await persistSession(response);
      setSession(response);
      return response;
    },
    async logout() {
      await clearSession();
      await clearStoredSession();
      setSession(null);
    },
    updateSessionUser(user) {
      setSession((current) => {
        if (!current) return current;
        const next = { ...current, user };
        setStoredSession(next).catch(() => {});
        return next;
      });
    },
    updateSessionStaff(staff) {
      setSession((current) => {
        if (!current) return current;
        const next = { ...current, staff };
        setStoredSession(next).catch(() => {});
        return next;
      });
    },
    async refreshUser() {
      if (!session?.user?.userId) return;
      try {
        const fresh = await apiClient.get(API_ENDPOINTS.USER_DETAIL(session.user.userId)) as any;
        setSession((current) => {
          if (!current) return current;
          const next = { ...current, user: { ...current.user, ...fresh } };
          setStoredSession(next).catch(() => {});
          return next;
        });
      } catch {
        // giữ session cũ nếu lỗi mạng
      }
    },
  }), [session, isRestoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
