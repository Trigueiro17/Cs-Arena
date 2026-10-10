import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getAccessToken, setAccessToken as setStoreAccessToken, clearAccessToken } from '../lib/token-store';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'PLAYER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string | null;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  steamId?: string | null;
  steamLevel?: number | null;
  cs2Hours?: number | null;
  skillRating?: number | null;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isOrganizer: boolean;
  isPlayer: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (name: string, nickname: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loginWithToken: (token: string, userData?: Partial<User>) => Promise<boolean>;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAdmin: false,
  isOrganizer: false,
  isPlayer: false,
  isAuthenticated: false,
  isLoading: true,
  token: null,
  login: async () => ({ success: false }),
  registerUser: async () => ({ success: false }),
  logout: async () => {},
  logoutAll: async () => {},
  refreshSession: async () => false,
  loginWithToken: async () => false,
  fetchWithAuth: async () => new Response(null, { status: 401 }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const applyAuth = useCallback((newUser: User | null, newAccessToken: string | null, expiresInSeconds?: number) => {
    setUser(newUser);
    setTokenState(newAccessToken);
    setStoreAccessToken(newAccessToken);

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Schedule silent refresh 1 minute before access token expiration
    if (newAccessToken && expiresInSeconds) {
      const refreshDelayMs = Math.max(10000, (expiresInSeconds - 60) * 1000);
      refreshTimerRef.current = setTimeout(() => {
        silentRefresh();
      }, refreshDelayMs);
    }
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setTokenState(null);
    clearAccessToken();
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Silent refresh via HttpOnly cookie
  const silentRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        // If there is no stored token, clear state
        if (!getAccessToken()) {
          clearAuth();
        }
        return false;
      }

      const data = await res.json();
      if (data.success && data.accessToken && data.user) {
        applyAuth(data.user, data.accessToken, data.expiresIn);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [applyAuth, clearAuth]);

  // Direct login using Access Token and optional user hint (e.g. Steam Callback)
  const loginWithToken = useCallback(
    async (accessToken: string, userData?: Partial<User>): Promise<boolean> => {
      setStoreAccessToken(accessToken);
      setTokenState(accessToken);

      if (userData && userData.name) {
        applyAuth(userData as User, accessToken, 900);
      }

      try {
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            applyAuth(meData.user, accessToken, 900);
            return true;
          }
        }
      } catch {}

      return Boolean(userData && userData.name);
    },
    [applyAuth]
  );

  // Initial session restoration on boot
  useEffect(() => {
    async function initSession() {
      try {
        const storedToken = getAccessToken();
        if (storedToken) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${storedToken}` },
              credentials: 'include',
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.user) {
                applyAuth(meData.user, storedToken, 900);
                setIsLoading(false);
                return;
              }
            }
          } catch {}
        }
        await silentRefresh();
      } finally {
        setIsLoading(false);
      }
    }
    initSession();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [applyAuth, silentRefresh]);

  // Login handler
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        return {
          success: false,
          error:
            res.status === 404
              ? 'Rota de autenticação não encontrada (404).'
              : res.status >= 500
              ? 'Erro interno no servidor. Verifique a configuração do banco de dados.'
              : 'Resposta inválida do servidor.',
        };
      }

      if (!res.ok) {
        const errorMsg = data.error?.includes('DATABASE_URL')
          ? 'Banco de dados não configurado na Vercel (adicione DATABASE_URL nas variáveis de ambiente).'
          : data.error || 'Credenciais inválidas.';
        return { success: false, error: errorMsg };
      }

      applyAuth(data.user, data.accessToken, data.expiresIn);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha na conexão com o servidor.' };
    }
  };

  // Register handler
  const registerUser = async (name: string, nickname: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nickname: nickname.trim(),
          email: email.trim(),
          password,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        return {
          success: false,
          error:
            res.status === 404
              ? 'Rota de registro não encontrada (404).'
              : res.status >= 500
              ? 'Erro interno no servidor. Verifique a configuração do banco de dados.'
              : 'Resposta inválida do servidor.',
        };
      }

      if (!res.ok) {
        const errorMsg = data.error?.includes('DATABASE_URL')
          ? 'Banco de dados não configurado na Vercel (adicione DATABASE_URL nas variáveis de ambiente).'
          : data.error || 'Falha ao cadastrar usuário.';
        return { success: false, error: errorMsg };
      }

      applyAuth(data.user, data.accessToken, data.expiresIn);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha na conexão com o servidor.' };
    }
  };

  // Logout current session
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    clearAuth();
  };

  // Logout all sessions
  const logoutAll = async () => {
    try {
      const currentToken = getAccessToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
      await fetch('/api/auth/logout-all', { method: 'POST', headers });
    } catch {}
    clearAuth();
  };

  // Wrapper for authenticated fetch with automatic 401 token retry
  const fetchWithAuth = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    let currentToken = getAccessToken();
    const headers = new Headers(init.headers || {});
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    let response = await fetch(input, { ...init, headers });

    // If 401 received, attempt silent refresh once and retry request
    if (response.status === 401) {
      const refreshed = await silentRefresh();
      if (refreshed) {
        currentToken = getAccessToken();
        const retryHeaders = new Headers(init.headers || {});
        if (currentToken) {
          retryHeaders.set('Authorization', `Bearer ${currentToken}`);
        }
        response = await fetch(input, { ...init, headers: retryHeaders });
      }
    }

    return response;
  };

  const normalizedRole = (user?.role || '').toUpperCase() as UserRole;
  const isAdmin = normalizedRole === 'ADMIN';
  const isOrganizer = normalizedRole === 'ORGANIZER' || isAdmin;
  const isPlayer = normalizedRole === 'PLAYER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? normalizedRole : null,
        isAdmin,
        isOrganizer,
        isPlayer,
        isAuthenticated: Boolean(user),
        isLoading,
        token,
        login,
        registerUser,
        logout,
        logoutAll,
        refreshSession: silentRefresh,
        loginWithToken,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
