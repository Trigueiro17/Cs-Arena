import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../lib/router';
import { Trophy, Shield, KeyRound, Mail, User, ArrowRight, CheckCircle2, UserPlus, LogIn, AtSign, HelpCircle, RefreshCw, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login, registerUser } = useAuth();
  const { navigate } = useRouter();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      if (urlError) {
        setError(decodeURIComponent(urlError));
      }
    } catch {}
  }, []);

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
      setError('Por favor, informe seu nome completo.');
      return;
    }

    if (!nickname.trim() || nickname.length < 2) {
      setError('Por favor, informe seu nickname de jogador (mínimo 2 caracteres).');
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
    const res = await registerUser(name, nickname, email, password);
    if (res.success) {
      setSuccessMsg('Conta de Jogador criada com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } else {
      setError(res.error || 'Erro ao criar conta.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Instruções de recuperação geradas.');
        if (data.resetToken) {
          setResetToken(data.resetToken);
          // Auto switch to reset mode for convenient test execution
          setTimeout(() => setMode('reset'), 1500);
        }
      } else {
        setError(data.error || 'Erro ao solicitar recuperação.');
      }
    } catch {
      setError('Erro de conexão ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setError('A nova senha deve conter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Senha redefinida com sucesso! Você já pode entrar.');
        setPassword('');
        setTimeout(() => setMode('login'), 1500);
      } else {
        setError(data.error || 'Token inválido ou expirado.');
      }
    } catch {
      setError('Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
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
            {mode === 'login' && 'Acesse sua conta para gerenciar e competir'}
            {mode === 'register' && 'Crie sua conta de Jogador para disputar torneios'}
            {mode === 'forgot' && 'Recuperação segura de senha'}
            {mode === 'reset' && 'Defina sua nova senha de acesso'}
          </p>
        </div>

        {/* Steam Login Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-[#1b2838] to-[#171a21] border border-cyan-500/30 shadow-lg shadow-cyan-950/30">
          <a
            href="/api/auth/steam"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#171a21] via-[#21354d] to-[#171a21] hover:from-[#21354d] hover:to-[#2a475e] border border-cyan-400/40 hover:border-cyan-300 text-white font-black text-sm flex items-center justify-center gap-3 transition-all group shadow-md"
          >
            <svg className="w-5 h-5 fill-current text-cyan-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.811c0 .085.005.17.005.257 0 1.84-1.492 3.332-3.332 3.332-1.495 0-2.763-.984-3.185-2.35L.373 15.034C1.942 20.246 6.551 24 12 24c6.627 0 12-5.373 12-12S18.627 0 11.979 0zM7.54 18.217l-1.473-.609c.266.586.75 1.05 1.359 1.281.986.375 2.095-.116 2.47-1.102.18-.475.166-.98-.014-1.423-.18-.444-.54-.783-.985-.953-.391-.148-.802-.148-1.185-.03l1.535.635c.465.193.687.727.495 1.192-.193.464-.727.686-1.192.495l-.014.514zm8.4-7.049c-1.252 0-2.268-1.016-2.268-2.268 0-1.253 1.016-2.269 2.268-2.269 1.253 0 2.269 1.016 2.269 2.269 0 1.252-1.016 2.268-2.269 2.268zm0-3.63c-.752 0-1.361.61-1.361 1.362s.609 1.362 1.361 1.362c.751 0 1.361-.61 1.361-1.362s-.61-1.362-1.361-1.362z" />
            </svg>
            <span className="tracking-wide">Entrar com a Steam</span>
          </a>

          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-cyan-300 font-medium text-center">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Sincroniza Nível Steam e Horas de CS2 para balancear partidas</span>
          </div>
        </div>

        <div className="relative mb-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-cs-card px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            ou continue com credenciais
          </span>
        </div>

        {/* Tab Switcher */}
        {(mode === 'login' || mode === 'register') && (
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
        )}

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

        {/* 1. Login Form */}
        {mode === 'login' && (
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                  className="text-xs text-cs-orange hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
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
        )}

        {/* 2. Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nickname de Jogador *
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Fallen, Simple, Cold"
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
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
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
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
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
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cs-orange"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-base tracking-wider flex items-center justify-center gap-2 shadow-glow-orange transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Conta de Jogador'}
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* 3. Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail Cadastrado
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-base tracking-wider flex items-center justify-center gap-2 shadow-glow-orange transition-all disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Solicitar Recuperação'}
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 block"
            >
              ← Voltar ao login
            </button>
          </form>
        )}

        {/* 4. Reset Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Token de Recuperação
              </label>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Cole o token recebido"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nova Senha (mínimo 8 caracteres)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha forte"
                required
                minLength={8}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-base tracking-wider flex items-center justify-center gap-2 shadow-glow-orange transition-all disabled:opacity-50"
            >
              {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
              <CheckCircle2 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 block"
            >
              ← Cancelar e voltar ao login
            </button>
          </form>
        )}

        {/* Demonstração rápida */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center mb-3">
            Acesso Rápido de Demonstração
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillQuickLogin('admin@csarena.com', 'admin123')}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 transition-all flex items-center justify-between text-xs group"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cs-orange" />
                <span className="font-bold text-amber-400 group-hover:text-amber-300">
                  Administrador Master
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">admin@csarena.com</span>
            </button>

            <button
              type="button"
              onClick={() => fillQuickLogin('player@csarena.com', 'player123')}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 transition-all flex items-center justify-between text-xs group"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sky-400 group-hover:text-sky-300">
                  Jogador Teste
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">player@csarena.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
