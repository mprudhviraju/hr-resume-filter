import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { CredentialResponse } from '@react-oauth/google';

const AUTH_TOKEN_KEY = 'google_id_token';
const AUTH_USER_KEY = 'auth_user';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export interface AuthUser {
  email: string;
  name?: string;
  role: 'user' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentialResponse: CredentialResponse) => Promise<void>;
  logout: () => void;
  authHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }, []);

  const verifyToken = useCallback(async (idToken: string): Promise<AuthUser> => {
    const res = await fetch(apiUrl('/api/auth/verify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { message?: string; error?: string }).message ||
        (body as { error?: string }).error ||
        `Verification failed (${res.status})`,
      );
    }

    const data = (await res.json()) as { user: AuthUser };
    return data.user;
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    verifyToken(token)
      .then((u) => {
        setUser(u);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(
    async (credentialResponse: CredentialResponse) => {
      const idToken = credentialResponse.credential;
      if (!idToken) throw new Error('No credential received from Google');

      const u = await verifyToken(idToken);
      setToken(idToken);
      setUser(u);
      localStorage.setItem(AUTH_TOKEN_KEY, idToken);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
    },
    [verifyToken],
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const authHeaders = useCallback((): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        authHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
