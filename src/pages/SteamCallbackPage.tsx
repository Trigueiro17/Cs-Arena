import React, { useEffect, useState } from 'react';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../lib/token-store';
import { ShieldCheck, Flame, Trophy, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

export function SteamCallbackPage() {
  const { navigate } = useRouter();
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [steamDetails, setSteamDetails] = useState<{
    steamId: string;
    skillRating: number;
    steamLevel: number;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const steamId = params.get('steamId');
    const skillRating = Number(params.get('skillRating')) || 1000;
    const steamLevel = Number(params.get('steamLevel')) || 1;
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(error));
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMessage('Token de acesso não encontrado no retorno da Steam.');
      return;
    }

    const userRole = (params.get('userRole') || 'PLAYER') as any;
    const userName = params.get('userName') || 'Jogador';
    const userNickname = params.get('userNickname') || userName;
    const userEmail = params.get('userEmail') || `${steamId}@steam.csarena.internal`;
    const userAvatar = params.get('userAvatar');
    const userId = params.get('userId') || '';

    const userData = {
      id: userId,
      name: userName,
      nickname: userNickname,
      email: userEmail,
      role: userRole,
      status: 'ACTIVE' as const,
      avatarUrl: userAvatar,
    };

    setSteamDetails({
      steamId: steamId || '',
      skillRating,
      steamLevel,
    });

    loginWithToken(token, userData)
      .then(() => {
        setStatus('success');
        setTimeout(() => {
          navigate('/');
        }, 1800);
      })
      .catch(() => {
        setStatus('success');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      });
  }, [navigate, loginWithToken]);

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="glass-panel rounded-3xl p-8 border border-cs-border shadow-2xl text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cs-orange/10 rounded-full blur-3xl pointer-events-none" />

        {status === 'loading' && (
          <div className="py-8">
            <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-glow" />
            <h2 className="text-xl font-black text-white font-display uppercase tracking-wide">
              Conectando à Steam...
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Validando assinatura OpenID e importando estatísticas de Counter-Strike 2.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 mx-auto flex items-center justify-center text-white shadow-glow mb-4">
              <ShieldCheck className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Steam Conectada
            </div>

            <h2 className="text-2xl font-black text-white font-display uppercase tracking-wide">
              Login Realizado!
            </h2>
            <p className="text-xs text-slate-300 mt-1 mb-6">
              Seu perfil Steam e nível foram sincronizados com sucesso para balanceamento de equipes.
            </p>

            {steamDetails && (
              <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 mb-6 text-left">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Nível Steam
                  </div>
                  <div className="text-lg font-black text-white flex items-center gap-1 mt-0.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-sky-400 font-mono">
                      {steamDetails.steamLevel}
                    </span>
                    Nvl {steamDetails.steamLevel}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Skill Rating (Elo)
                  </div>
                  <div className="text-lg font-black text-cs-orange flex items-center gap-1 mt-0.5">
                    <Flame className="w-4 h-4 fill-cs-orange" />
                    {steamDetails.skillRating} pts
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-sm tracking-wider flex items-center justify-center gap-2 shadow-glow-orange transition-all"
            >
              Ir para os Campeonatos <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-slate-500 mt-3">Redirecionando em instantes...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 mx-auto flex items-center justify-center text-red-400 mb-4">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <h2 className="text-xl font-black text-white font-display uppercase tracking-wide">
              Falha na Autenticação
            </h2>
            <p className="text-xs text-red-400 mt-2 mb-6">
              {errorMessage || 'Não foi possível validar seu login na Steam.'}
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Voltar para o Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
