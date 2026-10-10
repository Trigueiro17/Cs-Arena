import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useRouter, Link } from '../lib/router';
import {
  Trophy,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Users,
  Swords,
  Info,
} from 'lucide-react';
import { GameMode, getGameModeLabel } from '../lib/tournament-engine';

const registerSchema = z.object({
  nickname: z
    .string()
    .min(2, 'O nickname deve ter no mínimo 2 caracteres')
    .max(24, 'O nickname deve ter no máximo 24 caracteres'),
  steamId: z
    .string()
    .regex(/^$|^[0-9]{17}$/, 'Steam ID deve conter 17 dígitos numéricos ou ser vazio')
    .optional(),
  preferredRole: z.enum(['AWP', 'Entry', 'Support', 'IGL', 'Flex']),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar os termos do campeonato para participar' }),
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function TournamentRegisterPage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const { navigate } = useRouter();

  const [tournament, setTournament] = useState<any | null>(null);
  const [regSummary, setRegSummary] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, rRes] = await Promise.all([
          api.getTournament(id),
          api.getRegistrations(id),
        ]);
        setTournament(tRes.tournament);
        setRegSummary(rRes.summary);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [id]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      preferredRole: 'Flex',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await api.registerPlayer(id, {
        nickname: data.nickname,
        steamId: data.steamId || undefined,
        preferredRole: data.preferredRole,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate(`/tournaments/${id}`);
      }, 1500);
    } catch (err: any) {
      setServerError(err.message || 'Erro ao realizar inscrição.');
    }
  };

  const gameMode: GameMode = (tournament?.game_mode || '5v5') as GameMode;
  const teamSize = Number(tournament?.team_size) || 5;
  const is1v1 = teamSize === 1 || gameMode === '1v1';
  const modeLabel = getGameModeLabel(gameMode);

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Link
        to={`/tournaments/${id}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
      </Link>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cs-border shadow-2xl">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-cs-orange/15 text-cs-orange flex items-center justify-center mb-3">
            {is1v1 ? <Swords className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h1 className="text-3xl font-black font-display text-white">
            Inscrição Individual — {modeLabel}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {is1v1
              ? 'Todos os usuários se inscrevem individualmente. Os confrontos serão sorteados na roleta oficial.'
              : `Todos os usuários se inscrevem individualmente. Equipes completas de exatamente ${teamSize} jogadores serão sorteadas na roleta.`}
          </p>
        </div>

        {/* Live Registration Projections Badge */}
        {regSummary && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cs-orange" /> Situação Atual das Inscrições
              </span>
              <span className="font-mono text-cs-orange font-bold">
                {regSummary.active} inscritos
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase block">
                  {is1v1 ? 'Duelistas Prontos' : 'Equipes Completas'}
                </span>
                <span className="text-base font-black font-mono text-white mt-0.5 block">
                  {regSummary.completeTeams} {is1v1 ? 'duelistas' : `equipes de ${teamSize}`}
                </span>
              </div>

              {!is1v1 && (
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase block">Lista de Reservas</span>
                  <span className="text-base font-black font-mono text-amber-400 mt-0.5 block">
                    {regSummary.reservesCount} jogador(es)
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-tight pt-1">
              {regSummary.canStart ? (
                <span className="text-emerald-400 font-semibold">
                  ✓ Quantidade mínima atingida para iniciar o campeonato ({regSummary.minRequired} jogadores).
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">
                  Necessário no mínimo {regSummary.minRequired} jogadores para iniciar ({regSummary.minRequired - regSummary.active} restantes).
                </span>
              )}
            </p>
          </div>
        )}

        {serverError && (
          <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {serverError}
          </div>
        )}

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white font-display">Inscrição Confirmada!</h3>
            <p className="text-xs text-slate-300">
              Redirecionando para a página do torneio...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nickname no Counter-Strike 2 *
              </label>
              <input
                {...register('nickname')}
                type="text"
                placeholder="Ex: coldzera, s1mple, FalleN_Fan"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
              />
              {errors.nickname && (
                <p className="text-red-400 text-xs mt-1">{errors.nickname.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Steam ID 64 (Opcional)
              </label>
              <input
                {...register('steamId')}
                type="text"
                placeholder="Ex: 76561198000000000"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
              />
              {errors.steamId && (
                <p className="text-red-400 text-xs mt-1">{errors.steamId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Função Preferida
              </label>
              <select
                {...register('preferredRole')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cs-orange"
              >
                <option value="AWP">AWP (Sniper Principal)</option>
                <option value="Entry">Entry Fragger (Abertura de Bomb)</option>
                <option value="Support">Support / Trader</option>
                <option value="IGL">IGL (Capitão / Estrategista)</option>
                <option value="Flex">Flex (Versátil)</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('acceptTerms')}
                  className="mt-1 rounded bg-slate-900 border-slate-700 text-cs-orange focus:ring-0"
                />
                <span className="text-xs text-slate-300 leading-tight">
                  {is1v1
                    ? 'Concordo com as regras oficiais do torneio: duelos individuais 1x1 MD1 eliminatórios, sorteio da chave por roleta e avanço automático.'
                    : `Concordo com as regras oficiais do torneio: equipes de exatamente ${teamSize} jogadores sorteadas por roleta, chaveamento mata-mata MD1 e política de reservas auditada.`}
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-red-400 text-xs mt-1">{errors.acceptTerms.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-lg tracking-wider shadow-glow-orange transition-all disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Confirmando Inscrição...' : 'Concluir Inscrição no Torneio'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
