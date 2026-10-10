import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useRouter, Link } from '../lib/router';
import { Trophy, UserPlus, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

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
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Link
        to={`/tournaments/${id}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
      </Link>

      <div className="glass-panel rounded-3xl p-8 border border-cs-border shadow-2xl">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-cs-orange/15 text-cs-orange flex items-center justify-center mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black font-display text-white">
            Inscrição Individual — CS2 5x5
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            As equipes serão sorteadas via roleta oficial do servidor. Certifique-se de que seu nickname está correto.
          </p>
        </div>

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
                  Concordo com as regras oficiais do torneio: equipes de exatamente 5 jogadores sorteadas por roleta, chaveamento mata-mata e política de reservas auditada.
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
