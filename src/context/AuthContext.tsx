import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  login: async () => ({ success: false }),
  registerUser: async () => ({ success: false }),
  logout: async () => {},
  token: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cs_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const storedToken = localStorage.getItem('cs_token');
        const headers: Record<string, string> = {};
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser({
              id: data.user.userId,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
            });
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

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
        console.error('API /api/auth/login returned non-JSON:', res.status, text.slice(0, 200));
        return {
          success: false,
          error:
            res.status === 404
              ? 'Rota de autenticação não encontrada (404). Verifique as funções da Vercel.'
              : res.status >= 500
              ? `Erro no servidor (${res.status}). Verifique a variável DATABASE_URL na Vercel.`
              : `Resposta inválida do servidor (${res.status}).`,
        };
      }

      if (!res.ok) {
        return { success: false, error: data.error || 'Credenciais inválidas.' };
      }

      setToken(data.token);
      localStorage.setItem('cs_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha na conexão com o servidor.' };
    }
  };

  const registerUser = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('API /api/auth/register returned non-JSON:', res.status, text.slice(0, 200));
        return {
          success: false,
          error:
            res.status === 404
              ? 'Rota de registro não encontrada (404). Verifique as funções da Vercel.'
              : res.status >= 500
              ? `Erro no servidor (${res.status}). Verifique a variável DATABASE_URL na Vercel.`
              : `Resposta inválida do servidor (${res.status}).`,
        };
      }

      if (!res.ok) {
        return { success: false, error: data.error || 'Falha ao cadastrar usuário.' };
      }

      setToken(data.token);
      localStorage.setItem('cs_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha na conexão com o servidor.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('cs_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        registerUser,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
