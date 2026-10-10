import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../lib/router';
import { Trophy, Shield, KeyRound, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (res.success) {
      navigate('/admin');
    } else {
      setError(res.error || 'Falha no login');
    }
    setLoading(false);
  };

  const fillQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="glass-panel rounded-3xl p-8 border border-cs-border shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cs-orange to-amber-500 mx-auto flex items-center justify-center text-cs-dark shadow-glow-orange mb-4">
            <Trophy className="w-9 h-9 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black font-display text-white tracking-wide">
            Autenticação CS ARENA
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Acesso administrativo e gestão de campeonatos.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Demo Fast Fill Buttons */}
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
      </div>
    </div>
  );
}
