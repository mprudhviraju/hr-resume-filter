import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { CredentialResponse } from '@react-oauth/google';

const AUTH_TOKEN_KEY = 'google_id_token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_LOGIN_MESSAGE_KEY = 'auth_login_message';

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
  /** Fetch that auto-redirects to login on 401 */
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
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

export function popLoginMessage(): string | null {
  try {
    const msg = sessionStorage.getItem(AUTH_LOGIN_MESSAGE_KEY);
    if (msg) sessionStorage.removeItem(AUTH_LOGIN_MESSAGE_KEY);
    return msg;
  } catch {
    return null;
  }
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

  const redirectToLogin = useCallback((message?: string) => {
    try {
      if (message) sessionStorage.setItem(AUTH_LOGIN_MESSAGE_KEY, message);
    } catch {
      // ignore storage errors
    }
    // Force a full navigation so any stale app state is cleared.
    window.location.assign('/login');
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
      const err = new Error(
        (body as { message?: string; error?: string }).message ||
        (body as { error?: string }).error ||
        `Verification failed (${res.status})`,
      );
      (err as any).status = res.status;
      throw err;
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
      .catch((err) => {
        clearAuth();
        // Most common case: token expired / invalid
        const status = (err as any)?.status;
        if (status === 401) {
          redirectToLogin('Your session expired. Please sign in again.');
        }
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

  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
      clearAuth();
      redirectToLogin('Your session expired. Please sign in again.');
    }
    return res;
  }, [token, clearAuth, redirectToLogin]);

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
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
