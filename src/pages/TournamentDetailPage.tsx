import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Users,
  Shield,
  Play,
  UserPlus,
  GitFork,
  Tv,
  Calendar,
  FileText,
  CheckCircle2,
  Swords,
  Layers,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { GameMode, getGameModeLabel, getTeamSize } from '../lib/tournament-engine';

export function TournamentDetailPage({ params }: { params: Record<string, string> }) {
  const { id } = params;
  const { isAdmin, user } = useAuth();
  const { navigate } = useRouter();

  const [tournament, setTournament] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regSummary, setRegSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        api.getTournament(id),
        api.getRegistrations(id),
      ]);
      setTournament(tRes.tournament);
      setRegistrations(rRes.registrations || []);
      setRegSummary(rRes.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCloseRegistration = async () => {
    if (!confirm('Deseja realmente encerrar o período de inscrições deste campeonato?')) return;
    setActionLoading(true);
    try {
      await api.closeRegistration(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao encerrar inscrições');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async (playerId: string, nickname: string) => {
    if (!confirm(`Deseja cancelar a inscrição de ${nickname}?`)) return;
    setActionLoading(true);
    try {
      await api.cancelRegistration(id, playerId);
      setMessage(`Inscrição de ${nickname} cancelada com sucesso.`);
      setTimeout(() => setMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar inscrição');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Carregando detalhes do campeonato...</div>;
  }

  if (!tournament) {
    return <div className="text-center py-20 text-red-400">Campeonato não encontrado.</div>;
  }

  const gameMode: GameMode = (tournament.game_mode || '5v5') as GameMode;
  const teamSize = Number(tournament.team_size) || 5;
  const is1v1 = teamSize === 1 || gameMode === '1v1';
  const modeLabel = getGameModeLabel(gameMode);

  const activeRegistrations = registrations.filter(r => r.status !== 'withdrawn');
  const teamCount = is1v1 ? activeRegistrations.length : Math.floor(activeRegistrations.length / teamSize);
  const reserveCount = is1v1 ? 0 : activeRegistrations.length % teamSize;

  const canCancelAny = isAdmin && (tournament.status === 'registration_open' || tournament.status === 'registration_closed');

  return (
    <div className="space-y-8 pb-16">
      {/* Tournament Header Hero */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cs-border shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cs-orange/20 text-cs-orange border border-cs-orange/30">
                {tournament.status.replace('_', ' ')}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-800 text-sky-400 border border-slate-700">
                {modeLabel}
              </span>

              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold">
                MD{tournament.best_of || 1} • Mata-mata
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-wide">
              {tournament.name}
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {tournament.description || `Campeonato oficial de CS2 ${modeLabel} em eliminação simples. Inscrições individuais com roleta animada.`}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            {tournament.status === 'registration_open' && (
              <Link
                to={`/tournaments/${tournament.id}/register`}
                className="px-5 py-2.5 rounded-xl bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display text-base flex items-center gap-2 shadow-glow-orange transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Inscrever-se
              </Link>
            )}

            <Link
              to={`/tournaments/${tournament.id}/bracket`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <GitFork className="w-4 h-4 text-cs-cyan" />
              Chaveamento
            </Link>

            <Link
              to={`/tournaments/${tournament.id}/teams`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Users className="w-4 h-4 text-amber-400" />
              {is1v1 ? 'Duelistas' : 'Equipes'}
            </Link>

            <Link
              to={`/tournaments/${tournament.id}/live`}
              className="px-4 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 font-semibold text-sm flex items-center gap-2 border border-purple-700/50 transition-colors"
            >
              <Tv className="w-4 h-4 text-purple-400" />
              Modo OBS
            </Link>

            {isAdmin && (
              <Link
                to={`/admin/tournaments/${tournament.id}/draw`}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-cs-dark font-black font-display text-base flex items-center gap-2 shadow-glow-orange transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Roleta & Sorteio
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-cs-border">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Inscritos Ativos</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {activeRegistrations.length}
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">
              {is1v1 ? 'Duelistas Possíveis' : `Equipes ${teamSize}x${teamSize} Possíveis`}
            </div>
            <div className="text-2xl font-bold font-mono text-cs-orange mt-1">
              {teamCount} {is1v1 ? 'jogadores' : 'equipes'}
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Reservas Previstos</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {reserveCount} jogadores
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">
              {is1v1 ? 'Duelistas Registrados' : 'Equipes no Banco'}
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
              {tournament.teams_count || 0}
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {message}
        </div>
      )}

      {/* Admin Action Control Panel */}
      {isAdmin && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cs-orange" />
              Controles do Administrador • {modeLabel}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gerencie inscrições, execute o sorteio criptográfico oficial e controle o chaveamento eliminatório.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {tournament.status === 'registration_open' && (
              <button
                onClick={handleCloseRegistration}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 rounded-xl text-xs font-bold transition-colors"
              >
                Encerrar Inscrições
              </button>
            )}

            <Link
              to={`/admin/tournaments/${tournament.id}/draw`}
              className="px-4 py-2 bg-cs-orange hover:bg-cs-orange-hover text-cs-dark font-black font-display rounded-xl text-sm transition-colors shadow-glow-orange"
            >
              Abrir Tela de Sorteio
            </Link>

            <Link
              to={`/admin/tournaments/${tournament.id}/registrations`}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Gerenciar Inscritos
            </Link>
          </div>
        </div>
      )}

      {/* Tournament Rules Card */}
      <div className="glass-panel rounded-2xl p-6 border border-cs-border">
        <h3 className="text-lg font-bold font-display text-white flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-cs-orange" />
          Regulamento da Modalidade {modeLabel}
        </h3>
        <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
          {tournament.rules || 'Regras oficiais de Counter-Strike 2: partidas MD1 sem empates, chaveamento mata-mata com avanço automático.'}
        </p>
      </div>

      {/* Players Registered List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cs-orange" />
            Jogadores Inscritos ({activeRegistrations.length})
          </h2>
          <Link
            to={`/tournaments/${tournament.id}/teams`}
            className="text-xs text-cs-orange hover:underline font-bold"
          >
            Ver {is1v1 ? 'Duelistas' : 'Equipes'} Formadas →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {activeRegistrations.map(r => (
            <div
              key={r.registration_id}
              className="p-3.5 rounded-xl bg-cs-card border border-cs-border hover:border-slate-600 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3 truncate">
                <img
                  src={r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.nickname}`}
                  alt=""
                  className="w-10 h-10 rounded-lg bg-slate-800 p-0.5 border border-slate-700"
                />
                <div className="truncate">
                  <div className="font-bold text-white text-sm truncate">{r.nickname}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Rating: <span className="text-amber-400 font-bold">{r.skill_rating}</span> • {r.preferred_role}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {r.status === 'reserve' && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Reserva
                  </span>
                )}

                {canCancelAny && (
                  <button
                    onClick={() => handleCancelRegistration(r.player_id, r.nickname)}
                    title="Cancelar Inscrição"
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
