import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../lib/router';
import { Trophy, Shield, KeyRound, Mail, User, ArrowRight, CheckCircle2, UserPlus, LogIn } from 'lucide-react';

export function LoginPage() {
  const { login, registerUser } = useAuth();
  const { navigate } = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await login(email, password);
    if (res.success) {
      navigate('/admin');
    } else {
      setError(res.error || 'Credenciais inválidas.');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError('Por favor, informe seu nome ou nickname.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    const res = await registerUser(name, email, password);
    if (res.success) {
      setSuccessMsg('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } else {
      setError(res.error || 'Erro ao criar conta.');
    }
    setLoading(false);
  };

  const fillQuickLogin = (demoEmail: string, demoPass: string) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 pb-20">
      <div className="glass-panel rounded-3xl p-8 border border-cs-border shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cs-orange to-amber-500 mx-auto flex items-center justify-center text-cs-dark shadow-glow-orange mb-4">
            <Trophy className="w-9 h-9 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black font-display text-white tracking-wide">
            CS ARENA
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' ? 'Acesse sua conta para gerenciar e competir' : 'Crie sua conta para participar dos campeonatos'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-cs-orange text-cs-dark shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-cs-orange text-cs-dark shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Criar Conta
          </button>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@csarena.com"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-lg tracking-wider flex items-center justify-center gap-2 shadow-glow-orange transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar na Plataforma'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome Completo ou Nickname *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gabriel FalleN, Rafael_CS"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                E-mail *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@dominio.com"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Senha (mínimo 6 caracteres) *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Confirmar Senha *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-lg tracking-wider flex items-center justify-center gap-2 shadow-glow-orange transition-all disabled:opacity-50 mt-3"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Conta'}
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Demo Fast Fill Buttons (only on login mode) */}
        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 text-center mb-2">
              Acesso Rápido de Demonstração
            </div>
            <button
              type="button"
              onClick={() => fillQuickLogin('admin@csarena.com', 'admin123')}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs text-amber-300 font-semibold flex items-center justify-between border border-slate-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cs-orange" /> Administrador Master
              </span>
              <span className="font-mono text-[10px] text-slate-400">admin@csarena.com</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickLogin('player@csarena.com', 'player123')}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs text-sky-300 font-semibold flex items-center justify-between border border-slate-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Jogador Teste
              </span>
              <span className="font-mono text-[10px] text-slate-400">player@csarena.com</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
