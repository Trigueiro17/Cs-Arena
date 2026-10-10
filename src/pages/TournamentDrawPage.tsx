import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { RouletteWheel, DrawStep } from '../components/RouletteWheel';
import {
  Trophy,
  GitFork,
  Play,
  RotateCcw,
  AlertCircle,
  ArrowLeft,
  Shield,
  Swords,
  Users,
  Maximize2,
  Tv,
} from 'lucide-react';
import { GameMode, getGameModeLabel } from '../lib/tournament-engine';

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

  const gameMode: GameMode = (tournament?.game_mode || '5v5') as GameMode;
  const teamSize = Number(tournament?.team_size) || 5;
  const is1v1 = teamSize === 1 || gameMode === '1v1';
  const modeLabel = getGameModeLabel(gameMode);

  const activeRegistrations = registrations.filter(r => r.status !== 'withdrawn');
  const eligibleCount = activeRegistrations.length;
  const fullTeamsCount = is1v1 ? eligibleCount : Math.floor(eligibleCount / teamSize);
  const reservesCount = is1v1 ? 0 : eligibleCount % teamSize;
  const minRequired = is1v1 ? 2 : teamSize * 2;

  return (
    <div className="space-y-8 pb-16">
      {/* Navigation Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          to={`/tournaments/${id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Campeonato
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/tournaments/${id}/live`}
            className="px-3.5 py-1.5 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-700/50 text-xs font-bold hover:bg-purple-900/60 transition-colors flex items-center gap-1.5"
          >
            <Tv className="w-3.5 h-3.5 text-purple-400" />
            Transmissão OBS
          </Link>
        </div>
      </div>

      {/* Main Tournament Info */}
      <div className="glass-panel rounded-2xl p-6 border border-cs-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase font-bold text-cs-orange tracking-wider">
              {is1v1 ? <Swords className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              Central de Sorteios & Roleta • {modeLabel}
            </div>
            <h1 className="text-3xl font-black font-display text-white mt-1">
              {tournament.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {is1v1
                ? `Modalidade 1x1 Duelo. Total de ${eligibleCount} duelistas inscritos serão distribuídos por sorteio criptográfico na chave eliminatória.`
                : `Formação estrita de equipes ${teamSize}x${teamSize}. Total de ${eligibleCount} inscritos resultará em ${fullTeamsCount} equipes completas e ${reservesCount} reservas auditados.`}
            </p>
          </div>

          {/* Quick stats pills */}
          <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
            <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
              Inscritos: <strong className="text-white">{eligibleCount}</strong>
            </span>
            <span className="bg-slate-800 text-cs-orange px-3 py-1.5 rounded-lg border border-slate-700">
              {is1v1 ? 'Duelistas' : 'Equipes'}: <strong>{fullTeamsCount}</strong>
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
              {is1v1 ? <Swords className="w-8 h-8 stroke-[2.5]" /> : <Trophy className="w-8 h-8 stroke-[2.5]" />}
            </div>
            <h2 className="text-2xl font-bold font-display text-white">
              {is1v1 ? 'Configurar Sorteio dos Duelistas' : `Configurar Sorteio de Equipes (${modeLabel})`}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {is1v1
                ? 'O sorteio oficial distribui a ordem dos duelistas na chave de eliminação simples com aleatoriedade criptograficamente segura no Neon.'
                : `Selecione o modo de distribuição. Equipes com exatamente ${teamSize} jogadores serão formadas antes da reprodução animada da roleta.`}
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
                <div className="text-[11px] text-slate-400 mt-1">Chances iguais com Fisher-Yates seguro no servidor.</div>
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
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white">Balanceado</div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                    Steam Elo
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Snake draft por Nível Steam e horas de CS2 para equilibrar forças perfeitamente.
                </div>
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
                <div className="text-[11px] text-slate-400 mt-1">Top jogadores lideram as pontas da chave ou elencos.</div>
              </button>
            </div>
          </div>

          {eligibleCount < minRequired ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              Mínimo de {minRequired} inscritos ({is1v1 ? '2 duelistas' : `2 equipes de ${teamSize}`}) necessário para iniciar. Atualmente há apenas {eligibleCount} inscritos.
            </div>
          ) : (
            <button
              onClick={() => handleStartOfficialDraw(false)}
              disabled={isExecutingDraw}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cs-orange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-cs-dark font-black font-display text-xl tracking-wider shadow-glow-orange transition-all disabled:opacity-50"
            >
              {isExecutingDraw
                ? 'Gravando no Neon...'
                : is1v1
                ? 'Sortear Duelistas e Iniciar Roleta'
                : `Sortear Equipes (${teamSize}x${teamSize}) e Iniciar Roleta`}
            </button>
          )}
        </div>
      ) : (
        /* Roulette is Active or Teams are drawn */
        <div className="space-y-8">
          <RouletteWheel
            candidates={activeRegistrations.map(r => ({
              id: r.player_id,
              nickname: r.nickname,
              avatarUrl: r.avatar_url,
              preferredRole: r.preferred_role,
            }))}
            steps={
              drawResult?.animationSteps ||
              existingTeams.flatMap(t =>
                (t.members && t.members.length > 0
                  ? t.members
                  : [{ player_id: t.captain_id, nickname: t.name, avatar_url: null, is_captain: true }]
                ).map((m: any, idx: number) => ({
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
                Chaveamento Mata-Mata e Confrontos {modeLabel}
              </h3>
              <p className="text-xs text-slate-400">
                Gere automaticamente as chaves de eliminação simples MD1 com distribuição justa de BYEs.
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
