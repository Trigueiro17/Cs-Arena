import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { RouletteWheel, DrawStep } from '../components/RouletteWheel';
import { Trophy, GitFork, Play, RotateCcw, AlertCircle, ArrowLeft, Shield } from 'lucide-react';

export function TournamentDrawPage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const { isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [tournament, setTournament] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [existingTeams, setExistingTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Draw setup state
  const [algorithm, setAlgorithm] = useState<'random' | 'balanced' | 'captains'>('random');
  const [isExecutingDraw, setIsExecutingDraw] = useState(false);
  const [drawResult, setDrawResult] = useState<{
    drawId: string;
    animationSteps: DrawStep[];
  } | null>(null);
  const [bracketDrawn, setBracketDrawn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [tRes, rRes, tmRes] = await Promise.all([
        api.getTournament(id),
        api.getRegistrations(id),
        api.getTeams(id).catch(() => ({ teams: [] })),
      ]);
      setTournament(tRes.tournament);
      setRegistrations(rRes.registrations || []);
      setExistingTeams(tmRes.teams || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleStartOfficialDraw = async (forceReset = false) => {
    setIsExecutingDraw(true);
    setErrorMessage(null);

    try {
      const res = await api.drawTeams(id, {
        algorithm,
        forceReset,
        idempotencyKey: `draw-${id}-${Date.now()}`,
      });

      setDrawResult({
        drawId: res.drawId,
        animationSteps: res.animationSteps || [],
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao executar sorteio oficial');
    } finally {
      setIsExecutingDraw(false);
    }
  };

  const handleGenerateBracket = async () => {
    setIsExecutingDraw(true);
    setErrorMessage(null);
    try {
      await api.drawBracket(id);
      setBracketDrawn(true);
      setTimeout(() => {
        navigate(`/tournaments/${id}/bracket`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao gerar chaveamento');
    } finally {
      setIsExecutingDraw(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Carregando dados de sorteio...</div>;
  }

  const eligibleCount = registrations.length;
  const fullTeamsCount = Math.floor(eligibleCount / 5);
  const reservesCount = eligibleCount % 5;

  return (
    <div className="space-y-8 pb-16">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          to={`/tournaments/${id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
        </Link>
        <Link
          to={`/tournaments/${id}/live`}
          className="px-3 py-1.5 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-700/50 text-xs font-bold hover:bg-purple-900/60 transition-colors"
        >
          Visualização para Transmissão OBS
        </Link>
      </div>

      {/* Main Tournament Info */}
      <div className="glass-panel rounded-2xl p-6 border border-cs-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold text-cs-orange tracking-wider">
              Central de Sorteios & Roleta
            </div>
            <h1 className="text-3xl font-black font-display text-white mt-1">
              {tournament.name}
            </h1>
            <p className="text-xs text-slate-400">
              Formação estrita de equipes 5x5. Total de {eligibleCount} inscritos resultará em{' '}
              <strong className="text-white">{fullTeamsCount} equipes</strong> e{' '}
              <strong className="text-amber-400">{reservesCount} reservas auditados</strong>.
            </p>
          </div>

          {/* Quick stats pills */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
              Inscritos: <strong className="text-white">{eligibleCount}</strong>
            </span>
            <span className="bg-slate-800 text-cs-orange px-3 py-1.5 rounded-lg border border-slate-700">
              Equipes: <strong>{fullTeamsCount}</strong>
            </span>
            <span className="bg-slate-800 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-700">
              Reservas: <strong>{reservesCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* If draw has NOT been executed yet */}
      {!drawResult && existingTeams.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 border border-cs-border max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cs-orange to-amber-500 mx-auto flex items-center justify-center text-cs-dark shadow-glow-orange">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-bold font-display text-white">
              Configurar Sorteio Oficial
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Selecione o algoritmo de distribuição. O sorteio oficial é executado no servidor Neon com aleatoriedade criptograficamente segura antes da animação da roleta.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Modo de Distribuição
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAlgorithm('random')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  algorithm === 'random'
                    ? 'bg-cs-orange/15 border-cs-orange text-white shadow-glow-orange'
                    : 'bg-cs-surface border-cs-border text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-sm text-white">100% Aleatório</div>
                <div className="text-[11px] text-slate-400 mt-1">Chances iguais com Fisher-Yates seguro.</div>
              </button>

              <button
                type="button"
                onClick={() => setAlgorithm('balanced')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  algorithm === 'balanced'
                    ? 'bg-cs-orange/15 border-cs-orange text-white shadow-glow-orange'
                    : 'bg-cs-surface border-cs-border text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-sm text-white">Balanceado</div>
                <div className="text-[11px] text-slate-400 mt-1">Snake draft por rating para equilibrar times.</div>
              </button>

              <button
                type="button"
                onClick={() => setAlgorithm('captains')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  algorithm === 'captains'
                    ? 'bg-cs-orange/15 border-cs-orange text-white shadow-glow-orange'
                    : 'bg-cs-surface border-cs-border text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-sm text-white">Por Capitães</div>
                <div className="text-[11px] text-slate-400 mt-1">Top jogadores lideram cada elenco.</div>
              </button>
            </div>
          </div>

          {eligibleCount < 10 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              Mínimo de 10 inscritos (2 equipes de 5) necessário para iniciar. Atualmente há apenas {eligibleCount} inscritos.
            </div>
          ) : (
            <button
              onClick={() => handleStartOfficialDraw(false)}
              disabled={isExecutingDraw}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cs-orange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-cs-dark font-black font-display text-xl tracking-wider shadow-glow-orange transition-all disabled:opacity-50"
            >
              {isExecutingDraw ? 'Gravando no Neon...' : 'Sortear Equipes e Iniciar Roleta'}
            </button>
          )}
        </div>
      ) : (
        /* Roulette is Active or Teams are drawn */
        <div className="space-y-8">
          <RouletteWheel
            candidates={registrations.map(r => ({
              id: r.player_id,
              nickname: r.nickname,
              avatarUrl: r.avatar_url,
              preferredRole: r.preferred_role,
            }))}
            steps={
              drawResult?.animationSteps ||
              existingTeams.flatMap(t =>
                (t.members || []).map((m: any, idx: number) => ({
                  order: idx + 1,
                  playerId: m.player_id,
                  playerNickname: m.nickname,
                  avatarUrl: m.avatar_url,
                  teamName: t.name,
                  teamSeed: t.seed,
                  isCaptain: m.is_captain,
                }))
              )
            }
          />

          {/* Second Stage: Chaveamento dos Confrontos */}
          <div className="glass-panel rounded-2xl p-6 border border-cs-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold text-sky-400 tracking-wider">
                Segunda Etapa do Torneio
              </div>
              <h3 className="text-xl font-bold font-display text-white mt-0.5">
                Chaveamento Mata-Mata e Confrontos
              </h3>
              <p className="text-xs text-slate-400">
                Gere automaticamente as chaves de eliminação simples com distribuição de BYEs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => handleStartOfficialDraw(true)}
                  disabled={isExecutingDraw}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Sortear novamente com auditoria"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Sortear Novamente
                </button>
              )}

              <button
                onClick={handleGenerateBracket}
                disabled={isExecutingDraw}
                className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black font-display text-base tracking-wide flex items-center gap-2 shadow-glow-blue transition-all"
              >
                <GitFork className="w-5 h-5" />
                {bracketDrawn ? 'Chave Gerada!' : 'Sortear Chaveamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
